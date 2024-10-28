import { ReactNode, useId, useRef, KeyboardEvent, useState } from "react";

export const DataGrid = ({
  ariaReadOnly = "true",
  ariaRowCount = 0,
  ariaColumnCount = 0,
  caption,
  columns = [],
  data = [],
}: {
  columns?: string[];
  caption?: string;
  data?: Record<string, ReactNode>[];
  ariaReadOnly?: "true" | "false";
  ariaRowCount?: number;
  ariaColumnCount?: number;
}) => {
  const uid = useId();
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusPosition, setFocusPosition] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const lastFocusedCell = useRef<HTMLElement | null>(null);
  const shiftTabPressedRef = useRef(false); // Flag to detect Shift+Tab

  if (!columns?.length || !data?.length) {
    return null;
  }

  // Function to get all focusable cells in the table
  const getFocusableCells = (): HTMLElement[] => {
    if (!tableRef.current) return [];
    const cells = tableRef.current.querySelectorAll(
      'th[role="columnheader"], td[role="gridcell"], td[role="rowheader"]'
    );
    return Array.from(cells) as HTMLElement[];
  };

  // Function to focus a specific cell by coordinates
  const focusCell = (row: number, col: number) => {
    const cells = getFocusableCells();
    const totalCols = columns.length;
    const index = row === 0 ? col : row * totalCols + col;

    if (cells[index]) {
      cells[index].focus();
      setFocusPosition({ row, col });
      lastFocusedCell.current = cells[index];
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    // Detect 'Shift+Tab' to set the flag
    if (e.key === "Tab" && e.shiftKey) {
      shiftTabPressedRef.current = true;
      return; // Let the browser handle the tab navigation
    }

    // Ignore 'Tab' key to let the browser handle focus movement
    if (e.key === "Tab") {
      return;
    }

    if (!focusPosition) return;

    const totalRows = data.length + 1; // +1 for header row
    const totalCols = columns.length;
    let { row, col } = focusPosition;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (row > 0) {
          focusCell(row - 1, col);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (row < totalRows - 1) {
          focusCell(row + 1, col);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (col > 0) {
          focusCell(row, col - 1);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (col < totalCols - 1) {
          focusCell(row, col + 1);
        }
        break;
      case "Home":
        e.preventDefault();
        if (e.ctrlKey) {
          // Go to first cell of first row
          focusCell(0, 0);
        } else {
          // Go to first cell of current row
          focusCell(row, 0);
        }
        break;
      case "End":
        e.preventDefault();
        if (e.ctrlKey) {
          // Go to last cell of last row
          focusCell(totalRows - 1, totalCols - 1);
        } else {
          // Go to last cell of current row
          focusCell(row, totalCols - 1);
        }
        break;
      default:
        break;
    }
  };

  // Handle table focus
  const handleTableFocus = (e: React.FocusEvent<HTMLTableElement>) => {
    if (e.target === tableRef.current) {
      // If Shift+Tab was pressed, don't move focus into cells
      if (shiftTabPressedRef.current) {
        shiftTabPressedRef.current = false; // Reset the flag
        return;
      }
      if (lastFocusedCell.current) {
        lastFocusedCell.current.focus();
      } else {
        // Focus first header cell by default
        const firstCell = getFocusableCells()[0];
        if (firstCell) {
          firstCell.focus();
          setFocusPosition({ row: 0, col: 0 });
          lastFocusedCell.current = firstCell;
        }
      }
    }
  };

  // Update current focus position when cells are focused
  const handleCellFocus = (row: number, col: number) => {
    setFocusPosition({ row, col });
  };

  return (
    <div className="table-container">
      <table
        ref={tableRef}
        className="table"
        role="grid"
        id={`table-${uid}`}
        aria-readonly={ariaReadOnly}
        aria-rowcount={ariaRowCount}
        aria-colcount={ariaColumnCount}
        onKeyDown={handleKeyDown}
        onFocus={handleTableFocus}
        tabIndex={0}
      >
        {caption && (
          <caption className="table-caption" id={`table-caption-${uid}`}>
            {caption}
          </caption>
        )}

        <thead
          className="table-header"
          id={`table-thead-${uid}`}
          role="rowgroup"
        >
          <tr
            className="table-header-tr"
            id={`table-thead-tr-${uid}`}
            role="row"
          >
            {columns?.map?.((tableHeader: ReactNode, index) => (
              <th
                className="table-header-tr-th"
                key={`table-thead-tr-th-${index}`}
                role="columnheader"
                scope="col"
                id={`table-thead-tr-th-${uid}-${index}`}
                aria-labelledby={`table-thead-tr-th-span${uid}-${index}`}
                tabIndex={-1}
                onFocus={() => handleCellFocus(0, index)}
              >
                <span
                  className="table-header-tr-th-span"
                  id={`table-thead-tr-th-span${uid}-${index}`}
                >
                  {tableHeader}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body" role="rowgroup" id={`table-tbody-${uid}`}>
          {data?.map?.((tableBodyRow, rowIndex) => (
            <tr
              className="table-body-tr"
              key={`table-tbody-tr-${rowIndex}`}
              id={`table-tbody-tr-${uid}`}
              role="row"
              aria-rowindex={rowIndex}
            >
              {Object?.values(tableBodyRow)?.map?.((td, colIndex) => (
                <td
                  className="table-body-tr-td"
                  key={`table-tbody-tr-td-${rowIndex}-${colIndex}`}
                  tabIndex={-1}
                  aria-colindex={colIndex}
                  // OPTIONALLY USE COMMENTED ITEMS IF COLUMN ONE IS THE ROW HEADER
                  // scope={colIndex === 0 ? "row" : undefined}
                  // role={colIndex === 0 ? "rowheader" : "gridcell"}
                  // aria-readonly={colIndex === 0 ? "true" : undefined}
                  // aria-labelledby={`table-tbody-tr-td-span-${uid}-${rowIndex}-${colIndex}`}
                  // aria-describedby={
                  //   rowIndex !== 0
                  //     ? `table-thead-tr-th-${uid}-${colIndex} table-tbody-tr-td-${uid}-${rowIndex}-0`
                  //     : `table-thead-tr-th-${uid}-${colIndex}`
                  // }
                  role="gridcell"
                  id={`table-tbody-tr-td-${uid}-${rowIndex}-${colIndex}`}
                  onFocus={() => handleCellFocus(rowIndex + 1, colIndex)}
                >
                  <span
                    className="table-body-tr-td-span"
                    role="presentation"
                    id={`table-tbody-tr-td-span-${uid}-${rowIndex}-${colIndex}`}
                  >
                    {td}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
