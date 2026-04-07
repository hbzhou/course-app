interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return <div className={`skeleton ${className}`} />;
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
