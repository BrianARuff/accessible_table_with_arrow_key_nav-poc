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
    innerIndex?: number;
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

  // Function to get a cell at a specific position
  const getCellAtPosition = (row: number, col: number): HTMLElement | null => {
    const cells = getFocusableCells();
    const totalCols = columns.length;
    const index = row === 0 ? col : row * totalCols + col;
    return cells[index] || null;
  };

  // Function to get interactive elements within a cell
  const getInteractiveElements = (element: HTMLElement): HTMLElement[] => {
    const interactiveSelectors = `
      a[href],
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"])
    `;
    return Array.from(
      element.querySelectorAll<HTMLElement>(interactiveSelectors)
    );
  };

  // Function to focus a specific cell by coordinates and innerIndex
  const focusCell = (row: number, col: number, innerIndex = 0) => {
    const cell = getCellAtPosition(row, col);
    if (cell) {
      const interactiveElements = getInteractiveElements(cell);
      if (interactiveElements.length > 0) {
        // Adjust innerIndex to be within bounds
        innerIndex =
          (innerIndex + interactiveElements.length) %
          interactiveElements.length;
        interactiveElements[innerIndex].focus();
        lastFocusedCell.current = interactiveElements[innerIndex];
      } else {
        cell.focus();
        lastFocusedCell.current = cell;
        innerIndex = undefined; // No interactive elements
      }
      setFocusPosition({ row, col, innerIndex });
    }
  };

  // Helper function to determine if the element is an input or textarea
  const isTextInput = (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type;
    const isEditable = element.isContentEditable;
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      isEditable ||
      (tagName === "div" && isEditable) ||
      (tagName === "input" &&
        [
          "text",
          "password",
          "email",
          "number",
          "search",
          "tel",
          "url",
        ].includes(type))
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;

    // If focus is on an input, textarea, select, or contenteditable element, do not interfere with default behavior
    if (
      isTextInput(target) &&
      (e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown")
    ) {
      return;
    }

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
    let { row, col, innerIndex } = focusPosition;

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        const cell = getCellAtPosition(row, col);
        if (!cell) return;
        const interactiveElements = getInteractiveElements(cell);
        let newInnerIndex = innerIndex ?? 0;

        if (
          interactiveElements.length > 0 &&
          newInnerIndex < interactiveElements.length - 1
        ) {
          // Move to next interactive element within the same cell
          newInnerIndex += 1;
          focusCell(row, col, newInnerIndex);
        } else {
          // Move to first interactive element of next cell
          if (col < totalCols - 1) {
            focusCell(row, col + 1, 0);
          } else if (row < totalRows - 1) {
            // Move to first cell of next row
            focusCell(row + 1, 0, 0);
          }
        }
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const cell = getCellAtPosition(row, col);
        if (!cell) return;
        const interactiveElements = getInteractiveElements(cell);
        let newInnerIndex = innerIndex ?? 0;

        if (interactiveElements.length > 0 && newInnerIndex > 0) {
          // Move to previous interactive element within the same cell
          newInnerIndex -= 1;
          focusCell(row, col, newInnerIndex);
        } else {
          // Move to last interactive element of previous cell
          if (col > 0) {
            const prevCell = getCellAtPosition(row, col - 1);
            if (prevCell) {
              const prevInteractiveElements = getInteractiveElements(prevCell);
              const prevInnerIndex = prevInteractiveElements.length - 1;
              focusCell(
                row,
                col - 1,
                prevInnerIndex >= 0 ? prevInnerIndex : undefined
              );
            }
          } else if (row > 0) {
            // Move to last cell of previous row
            const prevCell = getCellAtPosition(row - 1, totalCols - 1);
            if (prevCell) {
              const prevInteractiveElements = getInteractiveElements(prevCell);
              const prevInnerIndex = prevInteractiveElements.length - 1;
              focusCell(
                row - 1,
                totalCols - 1,
                prevInnerIndex >= 0 ? prevInnerIndex : undefined
              );
            }
          }
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (row > 0) {
          const newRow = row - 1;
          const newCell = getCellAtPosition(newRow, col);
          if (newCell) {
            const newInteractiveElements = getInteractiveElements(newCell);
            let newInnerIndex = innerIndex ?? 0;
            // Adjust innerIndex if out of bounds
            if (newInteractiveElements.length > 0) {
              newInnerIndex = Math.min(
                newInnerIndex,
                newInteractiveElements.length - 1
              );
              focusCell(newRow, col, newInnerIndex);
            } else {
              focusCell(newRow, col);
            }
          }
        }
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        if (row < totalRows - 1) {
          const newRow = row + 1;
          const newCell = getCellAtPosition(newRow, col);
          if (newCell) {
            const newInteractiveElements = getInteractiveElements(newCell);
            let newInnerIndex = innerIndex ?? 0;
            // Adjust innerIndex if out of bounds
            if (newInteractiveElements.length > 0) {
              newInnerIndex = Math.min(
                newInnerIndex,
                newInteractiveElements.length - 1
              );
              focusCell(newRow, col, newInnerIndex);
            } else {
              focusCell(newRow, col);
            }
          }
        }
        break;
      }
      case "Home":
        e.preventDefault();
        if (e.ctrlKey) {
          // Go to first cell of first row
          focusCell(0, 0, 0);
        } else {
          // Go to first interactive element of current row
          focusCell(row, 0, 0);
        }
        break;
      case "End":
        e.preventDefault();
        if (e.ctrlKey) {
          // Go to last cell of last row
          focusCell(totalRows - 1, totalCols - 1, undefined);
        } else {
          // Go to last interactive element of current row
          const lastCell = getCellAtPosition(row, totalCols - 1);
          if (lastCell) {
            const interactiveElements = getInteractiveElements(lastCell);
            const lastInnerIndex = interactiveElements.length - 1;
            focusCell(
              row,
              totalCols - 1,
              lastInnerIndex >= 0 ? lastInnerIndex : undefined
            );
          }
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
          const interactiveElements = getInteractiveElements(firstCell);
          if (interactiveElements.length > 0) {
            interactiveElements[0].focus();
            lastFocusedCell.current = interactiveElements[0];
            setFocusPosition({ row: 0, col: 0, innerIndex: 0 });
          } else {
            firstCell.focus();
            lastFocusedCell.current = firstCell;
            setFocusPosition({ row: 0, col: 0 });
          }
        }
      }
    }
  };

  // Update current focus position when cells or their children are focused
  const handleCellFocus = (
    row: number,
    col: number,
    event: React.FocusEvent
  ) => {
    const target = event.target as HTMLElement;
    const cell = getCellAtPosition(row, col);
    if (cell) {
      const interactiveElements = getInteractiveElements(cell);
      const innerIndex = interactiveElements.findIndex((el) => el === target);
      setFocusPosition({
        row,
        col,
        innerIndex: innerIndex >= 0 ? innerIndex : undefined,
      });
    }
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
                onFocusCapture={(e) => handleCellFocus(0, index, e)}
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
                  role="gridcell"
                  id={`table-tbody-tr-td-${uid}-${rowIndex}-${colIndex}`}
                  onFocusCapture={(e) =>
                    handleCellFocus(rowIndex + 1, colIndex, e)
                  }
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
