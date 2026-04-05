interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return <div className={`skeleton ${className}`} />;
};

export const CardSkeleton = () => {
  return (
    <div className="skeleton-card">
      <Skeleton className="skeleton-title" />
      <Skeleton className="h-20 rounded-md" />
      <div className="space-y-2">
        <Skeleton className="skeleton-text" />
        <Skeleton className="skeleton-text w-5/6" />
        <Skeleton className="skeleton-text w-4/6" />
      </div>
      <Skeleton className="h-10 rounded-md w-full" />
    </div>
  );
};

export const CourseCardSkeleton = () => {
  return (
    <div className="rounded-lg border border-border overflow-hidden animate-pulse">
      <div className="p-6 space-y-4">
        <Skeleton className="skeleton-title" />
        <Skeleton className="h-12 rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-4 rounded-sm w-3/4" />
          <Skeleton className="h-4 rounded-sm w-2/3" />
          <Skeleton className="h-4 rounded-sm w-1/2" />
        </div>
        <Skeleton className="h-10 rounded-md w-full mt-4" />
      </div>
    </div>
  );
};

export const CourseGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => {
  return (
    <div className="flex gap-4 p-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 rounded-sm flex-1" />
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded-sm flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
};
