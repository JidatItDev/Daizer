import React from "react";
import { Loader } from "./Loader";

export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  className?: string;
  loading: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}
export function Table<T extends Record<string, any>>({
  columns,
  data,
  className = "",
  loading,
  pagination,
}: TableProps<T>) {
  return (
    <>
      <div className={`overflow-x-auto ${className}`}>
        {loading ? (
          <div className="flex items-center justify-center h-20 w-full py-2">
            <Loader size="xl" /> <span className="ml-3">Loading...</span>
          </div>
        ) : (
          <table className="w-full border-collapse font-poppins ">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`py-4 px-4 text-left text-sm  font-normal  ${
                      column.width ? `w-${column.width}` : ""
                    } ${
                      column.align === "center"
                        ? "text-center"
                        : column.align === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                    style={column.width ? { width: column.width } : {}}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((record, index) => (
                <tr
                  key={index}
                  className="hover:border-b hover:border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={`${index}-${column.key}`}
                      className={`py-4 px-4 text-sm text-black/50   ${
                        column.align === "center"
                          ? "text-center"
                          : column.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {/* {column.render
                        ? column.render(record[column.key], record, index)
                        : record[column.key] || "N/A"} */}
                      {column.render
                        ? column.render(
                            record[column.key as keyof T],
                            record,
                            index
                          )
                        : (record[column.key as keyof T] as any) || "N/A"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 mt-4 border-t border-gray-200 sm:flex-nowrap">
          <div className="text-sm text-gray-600">
            Showing {(pagination.current - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.current * pagination.pageSize,
              pagination.total
            )}{" "}
            of {pagination.total} entries
          </div>

          <div className="flex items-center gap-2 font-poppins">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onChange(1, Number(e.target.value))}
                className="h-8 pl-2 pr-2 text-sm text-primary-dark transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-primary-dark"
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  pagination.onChange(
                    pagination.current - 1,
                    pagination.pageSize
                  )
                }
                disabled={pagination.current === 1}
                className={`flex items-center justify-center w-8 h-8 text-gray-600 transition-colors duration-150 rounded-full ${
                  pagination.current === 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Page Numbers */}
              {Array.from(
                {
                  length: Math.min(
                    5,
                    Math.ceil(pagination.total / pagination.pageSize)
                  ),
                },
                (_, i) => {
                  const page =
                    pagination.current <= 3
                      ? i + 1
                      : Math.max(
                          1,
                          Math.min(
                            Math.ceil(pagination.total / pagination.pageSize) -
                              4,
                            pagination.current - 2
                          )
                        ) + i;
                  return (
                    <button
                      key={page}
                      onClick={() =>
                        pagination.onChange(page, pagination.pageSize)
                      }
                      className={`flex items-center justify-center w-8 h-8 text-sm rounded-full transition-colors duration-150 ${
                        pagination.current === page
                          ? "bg-primary-600 text-primary-dark font-bold"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
              )}

              <button
                onClick={() =>
                  pagination.onChange(
                    pagination.current + 1,
                    pagination.pageSize
                  )
                }
                disabled={
                  pagination.current * pagination.pageSize >= pagination.total
                }
                className={`flex items-center justify-center w-8 h-8 text-gray-600 transition-colors duration-150 rounded-full ${
                  pagination.current * pagination.pageSize >= pagination.total
                    ? "text-gray-400 cursor-not-allowed"
                    : "hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
