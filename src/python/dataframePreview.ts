import type { TablePreview } from './protocol'

export const DATAFRAME_PREVIEW_LIMITS = {
  rows: 100,
  columns: 20,
  cellCharacters: 300,
  cells: 2_000,
  bytes: 1024 * 1024,
  previews: 5,
  detailCharacters: 2_000,
  detailBytes: 128 * 1024,
} as const

export function isTablePreview(
  value: unknown,
): value is Omit<TablePreview, 'executionId' | 'previewId'> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const preview = value as Record<string, unknown>
  if (
    !Array.isArray(preview.columns) ||
    !Array.isArray(preview.index) ||
    !Array.isArray(preview.rows)
  ) {
    return false
  }
  const columns = preview.columns as unknown[]
  const indices = preview.index as unknown[]
  const rows = preview.rows as unknown[]
  const cellDetails = preview.cellDetails as unknown[]
  if (
    !Array.isArray(cellDetails) ||
    columns.length > DATAFRAME_PREVIEW_LIMITS.columns ||
    rows.length > DATAFRAME_PREVIEW_LIMITS.rows ||
    indices.length !== rows.length ||
    rows.length * columns.length > DATAFRAME_PREVIEW_LIMITS.cells ||
    cellDetails.length > DATAFRAME_PREVIEW_LIMITS.cells ||
    !columns.every((column) =>
      typeof column === 'string' && column.length <= DATAFRAME_PREVIEW_LIMITS.cellCharacters,
    ) ||
    !indices.every((index) =>
      typeof index === 'string' && index.length <= DATAFRAME_PREVIEW_LIMITS.cellCharacters,
    ) ||
    !rows.every((row) =>
      Array.isArray(row) &&
      row.length === columns.length &&
      row.every((cell) => typeof cell === 'string' && cell.length <= DATAFRAME_PREVIEW_LIMITS.cellCharacters),
    ) ||
    !cellDetails.every((detail) =>
      typeof detail === 'object' &&
      detail !== null &&
      Number.isSafeInteger((detail as Record<string, unknown>).row) &&
      Number.isSafeInteger((detail as Record<string, unknown>).column) &&
      ((detail as Record<string, unknown>).row as number) >= 0 &&
      ((detail as Record<string, unknown>).row as number) < rows.length &&
      ((detail as Record<string, unknown>).column as number) >= 0 &&
      ((detail as Record<string, unknown>).column as number) < columns.length &&
      typeof (detail as Record<string, unknown>).value === 'string' &&
      ((detail as Record<string, unknown>).value as string).length <= DATAFRAME_PREVIEW_LIMITS.detailCharacters &&
      typeof (detail as Record<string, unknown>).truncated === 'boolean',
    ) ||
    !Number.isSafeInteger(preview.totalRows) ||
    (preview.totalRows as number) < rows.length ||
    !Number.isSafeInteger(preview.totalColumns) ||
    (preview.totalColumns as number) < columns.length ||
    typeof preview.truncated !== 'boolean'
  ) {
    return false
  }
  return true
}

export function fitTablePreviewToByteLimit(
  value: unknown,
  executionId: number,
  previewId: number,
  remainingBytes: number,
): { preview: TablePreview; byteLength: number } | null {
  if (
    !isTablePreview(value) ||
    !Number.isSafeInteger(executionId) ||
    !Number.isSafeInteger(previewId) ||
    !Number.isFinite(remainingBytes) ||
    remainingBytes <= 0
  ) {
    return null
  }
  const preview: TablePreview = {
    ...value,
    executionId,
    previewId,
    columns: [...value.columns],
    index: [...value.index],
    rows: value.rows.map((row) => [...row]),
    cellDetails: [...value.cellDetails],
  }
  const originalRows = preview.rows
  const originalIndices = preview.index
  const originalDetails = preview.cellDetails
  const encodedSize = (): number => new TextEncoder().encode(JSON.stringify(preview)).byteLength

  let low = 0
  let high = originalRows.length
  let bestRowCount = -1
  while (low <= high) {
    const rowCount = Math.floor((low + high) / 2)
    preview.rows = originalRows.slice(0, rowCount)
    preview.index = originalIndices.slice(0, rowCount)
    preview.cellDetails = originalDetails.filter((detail) => detail.row < rowCount)
    preview.truncated = value.truncated || rowCount < originalRows.length
    if (encodedSize() <= remainingBytes) {
      bestRowCount = rowCount
      low = rowCount + 1
    } else {
      high = rowCount - 1
    }
  }
  if (bestRowCount >= 0) {
    preview.rows = originalRows.slice(0, bestRowCount)
    preview.index = originalIndices.slice(0, bestRowCount)
    preview.cellDetails = originalDetails.filter((detail) => detail.row < bestRowCount)
    preview.truncated = value.truncated || bestRowCount < originalRows.length
  } else {
    const originalColumns = preview.columns
    low = 0
    high = originalColumns.length
    let bestColumnCount = -1
    preview.rows = []
    preview.index = []
    preview.cellDetails = []
    preview.truncated = true
    while (low <= high) {
      const columnCount = Math.floor((low + high) / 2)
      preview.columns = originalColumns.slice(0, columnCount)
      if (encodedSize() <= remainingBytes) {
        bestColumnCount = columnCount
        low = columnCount + 1
      } else {
        high = columnCount - 1
      }
    }
    if (bestColumnCount < 0) return null
    preview.columns = originalColumns.slice(0, bestColumnCount)
  }
  const byteLength = encodedSize()
  return { preview, byteLength }
}

export const PYTHON_DATAFRAME_PREVIEW_SETUP = String.raw`
import json as _pystudio_json
import sys as _pystudio_sys

_PYSTUDIO_TABLE_MAX_ROWS = ${DATAFRAME_PREVIEW_LIMITS.rows}
_PYSTUDIO_TABLE_MAX_COLUMNS = ${DATAFRAME_PREVIEW_LIMITS.columns}
_PYSTUDIO_TABLE_MAX_CELL_CHARACTERS = ${DATAFRAME_PREVIEW_LIMITS.cellCharacters}
_PYSTUDIO_TABLE_MAX_CELLS = ${DATAFRAME_PREVIEW_LIMITS.cells}
_PYSTUDIO_TABLE_MAX_BYTES = ${DATAFRAME_PREVIEW_LIMITS.bytes}
_PYSTUDIO_TABLE_MAX_PREVIEWS = ${DATAFRAME_PREVIEW_LIMITS.previews}
_PYSTUDIO_TABLE_MAX_DETAIL_CHARACTERS = ${DATAFRAME_PREVIEW_LIMITS.detailCharacters}
_PYSTUDIO_TABLE_MAX_DETAIL_BYTES = ${DATAFRAME_PREVIEW_LIMITS.detailBytes}
_pystudio_table_preview_count = 0
_pystudio_cell_truncated = False

def _pystudio_table_format(value):
    try:
        _pystudio_missing = _pystudio_sys.modules.get("pandas")
        if _pystudio_missing is not None and _pystudio_missing.isna(value):
            return "NaN"
    except (TypeError, ValueError):
        pass
    return str(value)

def _pystudio_table_text(value):
    global _pystudio_cell_truncated
    _pystudio_text = _pystudio_table_format(value)
    if len(_pystudio_text) > _PYSTUDIO_TABLE_MAX_CELL_CHARACTERS:
        _pystudio_cell_truncated = True
        return _pystudio_text[:_PYSTUDIO_TABLE_MAX_CELL_CHARACTERS - 1] + "…"
    return _pystudio_text

def _pystudio_display(value):
    global _pystudio_table_preview_count, _pystudio_cell_truncated
    _pystudio_pd = _pystudio_sys.modules.get("pandas")
    if _pystudio_pd is None or not isinstance(value, (_pystudio_pd.DataFrame, _pystudio_pd.Series)):
        print(value)
        return
    if _pystudio_table_preview_count >= _PYSTUDIO_TABLE_MAX_PREVIEWS:
        print("[DataFrameプレビューは1回の実行につき5件までです]")
        return
    _pystudio_table_preview_count += 1
    _pystudio_frame = value.to_frame() if isinstance(value, _pystudio_pd.Series) else value
    _pystudio_total_rows, _pystudio_total_columns = _pystudio_frame.shape
    _pystudio_column_count = min(
        _pystudio_total_columns,
        _PYSTUDIO_TABLE_MAX_COLUMNS,
        _PYSTUDIO_TABLE_MAX_CELLS,
    )
    _pystudio_row_count = min(
        _pystudio_total_rows,
        _PYSTUDIO_TABLE_MAX_ROWS,
        _PYSTUDIO_TABLE_MAX_CELLS // max(1, _pystudio_column_count),
    )
    _pystudio_columns = [_pystudio_table_text(_column) for _column in _pystudio_frame.columns[:_pystudio_column_count]]
    _pystudio_indices = [
        _pystudio_table_text(_pystudio_index)
        for _pystudio_index in _pystudio_frame.index[:_pystudio_row_count]
    ]
    _pystudio_rows = []
    _pystudio_cell_details = []
    _pystudio_detail_bytes = 0
    _pystudio_base = {
        "columns": _pystudio_columns,
        "index": [],
        "rows": [],
        "cellDetails": _pystudio_cell_details,
        "totalRows": int(_pystudio_total_rows),
        "totalColumns": int(_pystudio_total_columns),
        "truncated": (
            _pystudio_total_rows > _pystudio_row_count or
            _pystudio_total_columns > _pystudio_column_count or
            _pystudio_cell_truncated
        ),
    }
    _pystudio_encoded = lambda _payload: _pystudio_json.dumps(
        _payload, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    _pystudio_used_bytes = len(_pystudio_encoded(_pystudio_base))
    for _pystudio_row_index in range(_pystudio_row_count):
        _pystudio_row = []
        _pystudio_row_details = []
        _pystudio_row_details_bytes = 0
        for _pystudio_column_index, _pystudio_cell in enumerate(
            _pystudio_frame.iloc[_pystudio_row_index, :_pystudio_column_count].tolist()
        ):
            _pystudio_cell_text = _pystudio_table_format(_pystudio_cell)
            if len(_pystudio_cell_text) > _PYSTUDIO_TABLE_MAX_CELL_CHARACTERS:
                _pystudio_cell_truncated = True
                _pystudio_row.append(_pystudio_cell_text[:_PYSTUDIO_TABLE_MAX_CELL_CHARACTERS - 1] + "…")
                _pystudio_detail = {
                    "row": _pystudio_row_index,
                    "column": _pystudio_column_index,
                    "value": _pystudio_cell_text[:_PYSTUDIO_TABLE_MAX_DETAIL_CHARACTERS],
                    "truncated": len(_pystudio_cell_text) > _PYSTUDIO_TABLE_MAX_DETAIL_CHARACTERS,
                }
                _pystudio_detail_size = len(_pystudio_encoded(_pystudio_detail))
                if (
                    _pystudio_detail_bytes + _pystudio_row_details_bytes +
                    _pystudio_detail_size <= _PYSTUDIO_TABLE_MAX_DETAIL_BYTES
                ):
                    _pystudio_row_details.append(_pystudio_detail)
                    _pystudio_row_details_bytes += _pystudio_detail_size
            else:
                _pystudio_row.append(_pystudio_cell_text)
        _pystudio_row_bytes = len(_pystudio_encoded(_pystudio_row))
        _pystudio_index_bytes = len(_pystudio_encoded(_pystudio_indices[_pystudio_row_index]))
        _pystudio_details_bytes = _pystudio_row_details_bytes
        if (
            _pystudio_used_bytes + _pystudio_row_bytes + _pystudio_index_bytes +
            _pystudio_details_bytes + 2 + len(_pystudio_row_details) > _PYSTUDIO_TABLE_MAX_BYTES
        ):
            _pystudio_base["truncated"] = True
            break
        _pystudio_rows.append(_pystudio_row)
        _pystudio_base["rows"] = _pystudio_rows
        _pystudio_base["index"].append(_pystudio_indices[_pystudio_row_index])
        _pystudio_cell_details.extend(_pystudio_row_details)
        _pystudio_detail_bytes += _pystudio_details_bytes
        _pystudio_used_bytes += (
            _pystudio_row_bytes + _pystudio_index_bytes + _pystudio_details_bytes +
            2 + len(_pystudio_row_details)
        )
    if _pystudio_cell_truncated:
        _pystudio_base["truncated"] = True
    if len(_pystudio_rows) < _pystudio_total_rows:
        _pystudio_base["truncated"] = True
    __pystudio_table_preview(_pystudio_json.dumps(
        _pystudio_base, ensure_ascii=False, separators=(",", ":")
    ))
`
