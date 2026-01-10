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
                className={`snap-start flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                  isActive
                    ? "bg-[#00FF85] text-black border-[#00FF85] shadow-[0_0_10px_rgba(0,255,133,0.3)]"
                    : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#D4AF37]/30"
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

