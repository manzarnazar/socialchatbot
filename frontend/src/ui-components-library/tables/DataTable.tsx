import React, { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "../buttons/Button";
import { DropdownSelect, SelectOption } from "../inputs/DropdownSelect";
import { Checkbox } from "../inputs/Checkbox";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchField?: keyof T | ((item: T) => string);
  filterOptions?: SelectOption[];
  activeFilter?: string;
  onFilterChange?: (filterValue: string) => void;
  onRefresh?: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  onPrimaryAction?: () => void;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (selectedKeys: string[]) => void;
  rowActions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
  pageSize?: number;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = "Search items...",
  searchField,
  filterOptions,
  activeFilter,
  onFilterChange,
  onRefresh,
  primaryActionLabel,
  primaryActionIcon = <Plus className="h-3.5 w-3.5" />,
  onPrimaryAction,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  rowActions,
  isLoading = false,
  pageSize = 10,
  emptyStateTitle = "No data found",
  emptyStateDescription = "There are no records matching your criteria.",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filtering
  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (typeof searchField === "function") {
          return searchField(item).toLowerCase().includes(term);
        }
        if (searchField && item[searchField] !== undefined) {
          return String(item[searchField]).toLowerCase().includes(term);
        }
        return Object.values(item).some((val) =>
          String(val).toLowerCase().includes(term)
        );
      });
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, searchField, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allKeys = paginatedData.map(keyExtractor);
      onSelectionChange(Array.from(new Set([...selectedKeys, ...allKeys])));
    } else {
      const pageKeys = new Set(paginatedData.map(keyExtractor));
      onSelectionChange(selectedKeys.filter((k) => !pageKeys.has(k)));
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedKeys, key]);
    } else {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    }
  };

  const isAllPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedKeys.includes(keyExtractor(item)));

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-4 font-sans text-left">
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-4 text-xs font-medium border border-[#E8E8E6] rounded-[6px] bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black transition-all shadow-2xs"
            />
          </div>

          {filterOptions && onFilterChange && (
            <DropdownSelect
              value={activeFilter || ""}
              onChange={onFilterChange}
              options={filterOptions}
              className="w-36"
            />
          )}

          {onRefresh && (
            <Button
              variant="icon-only"
              onClick={onRefresh}
              title="Reload data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {primaryActionLabel && onPrimaryAction && (
          <Button
            variant="primary"
            leftIcon={primaryActionIcon}
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </Button>
        )}
      </div>

      {/* Main Datatable Container */}
      <div className="border border-[#E8E8E6] rounded-[10px] overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="bg-zinc-50 border-b border-[#E8E8E6] text-zinc-500 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={isAllPageSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}

                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-6 py-3.5 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-black font-semibold cursor-pointer"
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                ))}

                {rowActions && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8E8E6] text-zinc-700">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {selectable && <td className="px-4 py-4"><div className="h-4 w-4 bg-zinc-200 rounded" /></td>}
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4">
                        <div className="h-3 bg-zinc-200 rounded w-24" />
                      </td>
                    ))}
                    {rowActions && <td className="px-6 py-4 text-right"><div className="h-6 w-16 bg-zinc-200 rounded ml-auto" /></td>}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
                    }
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-900">
                        {emptyStateTitle}
                      </h4>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        {emptyStateDescription}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item: T) => {
                  const key = keyExtractor(item);
                  const isSelected = selectedKeys.includes(key);

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-zinc-50/70 transition-all font-medium ${
                        isSelected ? "bg-zinc-50" : ""
                      }`}
                    >
                      {selectable && (
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={isSelected}
                            onChange={(checked: boolean) => handleSelectRow(key, checked)}
                          />
                        </td>
                      )}

                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-6 py-4 ${
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                              ? "text-center"
                              : "text-left"
                          } ${col.className || ""}`}
                        >
                          {col.render
                            ? col.render(item)
                            : String(item[col.key] ?? "-")}
                        </td>
                      ))}

                      {rowActions && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {rowActions(item)}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Strip */}
        {!isLoading && filteredData.length > 0 && (
          <div className="px-6 py-3 bg-zinc-50/50 border-t border-[#E8E8E6] flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)}{" "}
              to {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
              {filteredData.length} records
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-semibold text-zinc-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
