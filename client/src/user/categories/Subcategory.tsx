import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useSubcategoriesOfCategory } from "../../api/UseCategories";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IoCaretBackOutline } from "react-icons/io5";

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
        navigate(`/products/${category.id}`, {
          state: { name: category.name },
        });
      }}
      className="bg-white rounded-[20px] border  border-gray-200 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div
        className="
    absolute top-[16px] left-[16px] 
    w-[26px] h-[26px] 
    rounded-full 
    bg-white 
    border-[3px] border-[#656565] 
    opacity-100 
    shadow-[inset_0px_4px_5px_0px_rgba(0,0,0,0.7)]
  "
      />
      <div className="h-[190px] bg-gray-100 flex items-center justify-center">
        {category.image ? (
          <img
            src={category?.image?.url}
            alt={category.name}
            className="h-full w-full  object-cover border-primary-dark border-2 rounded-tl-[20px] rounded-tr-[20px]"
          />
        ) : (
          <div className="text-gray-400 text-lg font-medium">No Image</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-poppins text-lg mb-1 truncate flex items-center justify-center bg-primary-dark text-white rounded-full px-3 py-1.5">
          {category.name}
        </h3>
      </div>
    </div>
  );
};

const Subcategory = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const categoryName = location.state?.name;
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [allSubcategories, setAllSubcategories] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  // const observer = useRef<IntersectionObserver>();
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const limit = 10;

  const {
    data: subcategoriesData,
    isLoading,
    isFetching,
  } = useSubcategoriesOfCategory(id || "");

  // Reset state when categoryId changes
  useEffect(() => {
    setPage(1);
    setAllSubcategories([]);
    setHasMore(true);
  }, [id]);

  // Merge new subcategories with existing ones
  useEffect(() => {
    if (subcategoriesData?.subcategories) {
      setAllSubcategories((prev) => {
        // Avoid duplicates - reset if it's the first page
        if (page === 1) {
          return subcategoriesData.subcategories;
        }

        const newSubcategories = subcategoriesData.subcategories.filter(
          (newCat) => !prev.some((existingCat) => existingCat.id === newCat.id)
        );
        return [...prev, ...newSubcategories];
      });

      if (subcategoriesData.subcategories.length < limit) {
        setHasMore(false);
      }
    }
  }, [subcategoriesData, page, limit]);

  useEffect(() => {
    if (isLoading || !hasMore || !subcategoriesData) return;

    const observerOptions = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const handleObserver: IntersectionObserverCallback = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isFetching && hasMore) {
        setHasMore(false);
      }
    };

    observer.current = new IntersectionObserver(
      handleObserver,
      observerOptions
    );

    if (loadingRef.current && hasMore) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, isFetching, hasMore, subcategoriesData]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="bg-white relative min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center text-primary-dark hover:text-black transition-colors border border-primary-dark   rounded-full p-2"
          >
            {/* <ArrowLeft size={20} className="mr-2" /> */}
            <IoCaretBackOutline />
          </button>
          <Heading>{categoryName || "Category"}</Heading>
        </div>
        <div className="flex items-center gap-4 relative">
          <Button
            variant="outline"
            size="md"
            className="border-2 border-primary-dark px-6 !py-2"
            onClick={() => navigate("/myOrders")}
          >
            My orders
          </Button>
        </div>
      </div>

      {/* Subcategories Grid */}
      {allSubcategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6  border-t-2 border-black/50 pt-6">
          {allSubcategories.map((subcategory) => (
            <CategoryCard key={subcategory.id} category={subcategory} />
          ))}
        </div>
      )}

      {/* Loading and end messages */}
      <div ref={loadingRef} className="mt-8 flex justify-center">
        {isFetching && !(allSubcategories.length === 0) ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="h-6 w-6 animate-spin text-primary-dark mr-2" />
            <span>Loading subcategories...</span>
          </div>
        ) : !hasMore && allSubcategories.length > 0 ? (
          <div className="text-gray-500 py-4">
            No more subcategories to load
          </div>
        ) : allSubcategories.length === 0 && !isLoading ? (
          <div className="text-gray-500 py-4">
            No subcategories found for this category
          </div>
        ) : null}
      </div>

      {/* Initial loading state */}
      {isLoading && allSubcategories.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
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

export default Subcategory;
