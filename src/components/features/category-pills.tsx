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
    <nav className="backdrop-blur-2xl bg-background/60 border-b border-white/10 shadow-lg shadow-black/10">
      <div className="overflow-x-auto snap-x scrollbar-hide">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {tags.map((tag: string) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`snap-start flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border backdrop-blur-sm transition-all duration-300 ${
                  isActive
                    ? "bg-[#00FF85] text-black border-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.4)]"
                    : "bg-white/5 hover:bg-white/15 border-white/15 hover:border-[#D4AF37]/40 hover:shadow-[0_0_10px_rgba(212,175,55,0.15)]"
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

