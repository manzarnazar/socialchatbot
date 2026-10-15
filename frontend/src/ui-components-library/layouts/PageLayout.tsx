import React from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageLayoutProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  filterBar,
  children,
  sidebar,
  className = "",
}) => {
  return (
    <div className={`space-y-6 font-sans text-zinc-900 ${className}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E8E6] pb-5">
        <div className="space-y-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-[11px] text-zinc-400 select-none mb-1">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-zinc-300">/</span>}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="hover:text-zinc-800 transition-colors font-medium"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="font-semibold text-zinc-600">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          <h1 className="text-xl font-bold tracking-tight text-zinc-900 uppercase">
            {title}
          </h1>

          {description && (
            <p className="text-xs text-zinc-500 font-normal">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
        )}
      </div>

      {/* Filter / Control Bar */}
      {filterBar && (
        <div className="bg-white border border-[#E8E8E6] p-3 rounded-lg shadow-2xs">
          {filterBar}
        </div>
      )}

      {/* Main Content Layout with optional Sidebar */}
      {sidebar ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">{children}</div>
          <div className="lg:col-span-1 space-y-4 bg-white border border-[#E8E8E6] rounded-xl p-4 shadow-2xs">
            {sidebar}
          </div>
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </div>
  );
};
