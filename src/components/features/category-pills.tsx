"use client";

interface CategoryPillsProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function CategoryPills({ tags, selectedTag, onSelectTag }: CategoryPillsProps) {
  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      onSelectTag(null);
    } else {
      onSelectTag(tag);
    }
  };

  return (
    <nav className="backdrop-blur-md bg-background/80 border-b">
      <div className="overflow-x-auto snap-x scrollbar-hide">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {tags.map((tag: string) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`snap-start flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white/10 hover:bg-white/20 border-white/20"
                }`}
                type="button"
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

