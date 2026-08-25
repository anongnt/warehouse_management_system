import { useReducer, useCallback } from 'react';
import { StockBalance } from '../types/stock.types';

export type StockFormMode = 'receipt' | 'issue' | 'adjustment';

export interface StockFormRow {
  key: number;
  productId: string;
  productName: string;
  sku: string;
  onHandBalance: number | null;
  quantity: string; // receipt / issue
  unitCost: string; // receipt only
  countedQuantity: string; // adjustment only
  reason: string; // adjustment only
}

export interface StockFormState {
  mode: StockFormMode;
  rows: StockFormRow[];
  nextKey: number;
  submitting: boolean;
  // Keyed by row index so `items[i].field` details map straight onto a row
  rowErrors: Record<number, Record<string, string>>;
  formErrors: string[];
}

export type StockFormAction =
  | { type: 'addRow' }
  | { type: 'removeRow'; key: number }
  | { type: 'updateRow'; key: number; patch: Partial<Omit<StockFormRow, 'key'>> }
  | { type: 'selectProduct'; key: number; product: StockBalance | null }
  | { type: 'setSubmitting'; submitting: boolean }
  | { type: 'setErrors'; rowErrors: Record<number, Record<string, string>>; formErrors: string[] }
  | { type: 'clearErrors' }
  | { type: 'reset' };

export function createEmptyRow(key: number): StockFormRow {
  return {
    key,
    productId: '',
    productName: '',
    sku: '',
    onHandBalance: null,
    quantity: '',
    unitCost: '',
    countedQuantity: '',
    reason: '',
  };
}

export function initialStockFormState(mode: StockFormMode): StockFormState {
  return {
    mode,
    rows: [createEmptyRow(1)],
    nextKey: 2,
    submitting: false,
    rowErrors: {},
    formErrors: [],
  };
}

// Pure reducer - the single source of truth for row add/remove/update behaviour
export function stockFormReducer(state: StockFormState, action: StockFormAction): StockFormState {
  switch (action.type) {
    case 'addRow':
      return {
        ...state,
        rows: [...state.rows, createEmptyRow(state.nextKey)],
        nextKey: state.nextKey + 1,
      };

    case 'removeRow': {
      // Always keep at least one row so the form is never empty
      if (state.rows.length <= 1) {
        return state;
      }
      const rows = state.rows.filter((row) => row.key !== action.key);
      if (rows.length === state.rows.length) {
        return state;
      }
      return { ...state, rows, rowErrors: {} };
    }

    case 'updateRow':
      return {
        ...state,
        rows: state.rows.map((row) =>
          row.key === action.key ? { ...row, ...action.patch } : row
        ),
      };

    case 'selectProduct':
      return {
        ...state,
        rows: state.rows.map((row) =>
          row.key === action.key
            ? {
                ...row,
                productId: action.product ? action.product.productId : '',
                productName: action.product ? action.product.name : '',
                sku: action.product ? action.product.sku : '',
                onHandBalance: action.product ? action.product.onHandBalance : null,
              }
            : row
        ),
      };

    case 'setSubmitting':
      return { ...state, submitting: action.submitting };

    case 'setErrors':
      return { ...state, rowErrors: action.rowErrors, formErrors: action.formErrors };

    case 'clearErrors':
      return { ...state, rowErrors: {}, formErrors: [] };

    case 'reset':
      return initialStockFormState(state.mode);

    default:
      return state;
  }
}

const ITEM_PATH_REGEX = /^items\[(\d+)\]\.(.+)$/;

/**
 * Maps `error.details` entries onto rows and fields. Keys shaped like
 * `items[2].quantity` land on row 2 / field `quantity`; anything that cannot be
 * mapped becomes a form-level error so no message is ever lost.
 */
export function mapErrorDetails(
  details?: Record<string, string>[]
): { rowErrors: Record<number, Record<string, string>>; formErrors: string[] } {
  const rowErrors: Record<number, Record<string, string>> = {};
  const formErrors: string[] = [];

  if (!details) {
    return { rowErrors, formErrors };
  }

  for (const detail of details) {
    for (const [path, message] of Object.entries(detail)) {
      const match = ITEM_PATH_REGEX.exec(path);
      if (match) {
        const index = parseInt(match[1], 10);
        const field = match[2];
        if (!rowErrors[index]) {
          rowErrors[index] = {};
        }
        rowErrors[index][field] = message;
      } else {
        formErrors.push(message);
      }
    }
  }

  return { rowErrors, formErrors };
}

/**
 * Client-side warnings per row index. Issue documents may not exceed the
 * current balance, so every offending row gets its own message.
 */
export function getRowWarnings(mode: StockFormMode, rows: StockFormRow[]): Record<number, string> {
  const warnings: Record<number, string> = {};

  if (mode !== 'issue') {
    return warnings;
  }

  rows.forEach((row, index) => {
    if (!row.productId || row.quantity === '') {
      return;
    }
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || row.onHandBalance === null) {
      return;
    }
    if (quantity > row.onHandBalance) {
      warnings[index] =
        `จำนวนที่ขอจ่ายออก ${quantity} ชิ้น เกินยอดคงเหลือ ${row.onHandBalance} ชิ้น`;
    }
  });

  return warnings;
}

function isIntegerInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === '') {
    return false;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

// A row is complete enough to submit
export function isRowValid(mode: StockFormMode, row: StockFormRow): boolean {
  if (!row.productId) {
    return false;
  }

  if (mode === 'adjustment') {
    return isIntegerInRange(row.countedQuantity, 0, 999999) && row.reason.trim().length > 0;
  }

  if (!isIntegerInRange(row.quantity, 1, 999999)) {
    return false;
  }

  if (mode === 'receipt' && row.unitCost.trim() !== '') {
    const unitCost = Number(row.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 999999999.99) {
      return false;
    }
    const decimals = row.unitCost.split('.')[1];
    if (decimals && decimals.length > 2) {
      return false;
    }
  }

  return true;
}

// Saving is disabled while submitting, when a row is incomplete, or when a row
// asks for more than the available balance
export function canSubmitForm(state: StockFormState): boolean {
  if (state.submitting || state.rows.length === 0) {
    return false;
  }
  if (Object.keys(getRowWarnings(state.mode, state.rows)).length > 0) {
    return false;
  }
  return state.rows.every((row) => isRowValid(state.mode, row));
}

export interface UseStockDocumentFormReturn {
  state: StockFormState;
  rowWarnings: Record<number, string>;
  canSubmit: boolean;
  addRow: () => void;
  removeRow: (key: number) => void;
  updateRow: (key: number, patch: Partial<Omit<StockFormRow, 'key'>>) => void;
  selectProduct: (key: number, product: StockBalance | null) => void;
  setSubmitting: (submitting: boolean) => void;
  applyErrorDetails: (details?: Record<string, string>[], fallbackMessage?: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

export function useStockDocumentForm(mode: StockFormMode): UseStockDocumentFormReturn {
  const [state, dispatch] = useReducer(stockFormReducer, mode, initialStockFormState);

  const addRow = useCallback(() => dispatch({ type: 'addRow' }), []);
  const removeRow = useCallback((key: number) => dispatch({ type: 'removeRow', key }), []);
  const updateRow = useCallback(
    (key: number, patch: Partial<Omit<StockFormRow, 'key'>>) =>
      dispatch({ type: 'updateRow', key, patch }),
    []
  );
  const selectProduct = useCallback(
    (key: number, product: StockBalance | null) => dispatch({ type: 'selectProduct', key, product }),
    []
  );
  const setSubmitting = useCallback(
    (submitting: boolean) => dispatch({ type: 'setSubmitting', submitting }),
    []
  );
  const clearErrors = useCallback(() => dispatch({ type: 'clearErrors' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const applyErrorDetails = useCallback(
    (details?: Record<string, string>[], fallbackMessage?: string) => {
      const { rowErrors, formErrors } = mapErrorDetails(details);
      if (formErrors.length === 0 && Object.keys(rowErrors).length === 0 && fallbackMessage) {
        formErrors.push(fallbackMessage);
      }
      dispatch({ type: 'setErrors', rowErrors, formErrors });
    },
    []
  );

  return {
    state,
    rowWarnings: getRowWarnings(state.mode, state.rows),
    canSubmit: canSubmitForm(state),
    addRow,
    removeRow,
    updateRow,
    selectProduct,
    setSubmitting,
    applyErrorDetails,
    clearErrors,
    reset,
  };
}
