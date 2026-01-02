import { useState, useEffect, useRef } from "react";
import { useParentCategories } from "../../api/UseCategories";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Category card component
interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    image: {
      url: string;
      name: string;
    };
    parentCategoryId: string | null;
    createdAt: string;
  };
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => {
        navigate(`/browse-categories/${category.id}`, {
          state: { name: category.name },
        });
      }}
      className="bg-white rounded-[20px]   cursor-pointer  overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="h-[190px] bg-gray-100 flex items-center justify-center ">
        {category.image ? (
          <img
            src={category?.image?.url}
            alt={category.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-lg font-medium">No Image</div>
        )}
      </div>
      <div className="px-4 py-1  border-primary-dark border-2 rounded-bl-[20px] rounded-br-[20px] ">
        <h3 className="font-poppins  text-lg mb-1 truncate font-medium flex items-center justify-center  text-primary-dark px-3 py-1.5">
          {category.name}
        </h3>
      </div>
    </div>
  );
};

// Main categories component
const Categories = () => {
  const [page, setPage] = useState(1);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  // const observer = useRef<IntersectionObserver>();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const limit = 10;

  const {
    data: categoriesData,
    isLoading,
    isFetching,
  } = useParentCategories({
    page,
    limit,
  });

  // Merge new categories with existing ones
  useEffect(() => {
    if (categoriesData?.categories) {
      setAllCategories((prev) => {
        // Avoid duplicates
        const newCategories = categoriesData.categories.filter(
          (newCat) => !prev.some((existingCat) => existingCat.id === newCat.id)
        );
        return [...prev, ...newCategories];
      });

      // Check if there are more categories to load
      const totalPages = categoriesData.pagination?.totalPages || 1;
      // const currentItems = categoriesData.pagination?.total || 0;

      if (categoriesData.categories.length < limit || page >= totalPages) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [categoriesData, page, limit]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observerOptions = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const handleObserver: IntersectionObserverCallback = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isFetching && hasMore) {
        setPage((prev) => prev + 1);
      }
    };

    observer.current = new IntersectionObserver(
      handleObserver,
      observerOptions
    );

    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, isFetching, hasMore]);

  return (
    <div className="bg-white relative min-h-screen">
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <Heading>Product Browsing</Heading>
        </div>
        <div className="flex items-center gap-4 relative">
          <Button
            variant="outline"
            size="md"
            className="border-2 border-primary-dark px-6 !py-2"
            onClick={() => navigate("/myOrders")}
          >
            My Orders
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-white border-t-2 border-black/50 pt-6">
        {allCategories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      {/* Loading and end messages */}
      <div ref={loadingRef} className="mt-8 flex justify-center">
        {isFetching && !(allCategories.length === 0) ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="h-6 w-6 animate-spin text-primary-dark mr-2" />
            <span>Loading more categories...</span>
          </div>
        ) : !hasMore && allCategories.length > 0 ? (
          <div className="text-gray-500 py-4">No more categories to load</div>
        ) : allCategories.length === 0 && !isLoading ? (
          <div className="text-gray-500 py-4">No categories found</div>
        ) : null}
      </div>

      {/* Initial loading state */}
      {isLoading && allCategories.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6 ">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="h-40 bg-gray-200 animate-pulse"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
