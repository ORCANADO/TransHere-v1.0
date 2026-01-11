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
    <nav className="relative bg-transparent border-0 outline-none" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
      <div className="overflow-x-auto snap-x scrollbar-hide bg-transparent border-0" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
        <div className="flex gap-3 px-4 py-3 min-w-max bg-transparent border-0" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
          {tags.map((tag: string) => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`snap-start flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-[#00FF85] text-black border border-[#00FF85] shadow-[0_0_20px_rgba(0,255,133,0.4)]"
                    : "bg-white/10 backdrop-blur-xl border-0 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:bg-white/15 hover:shadow-[0_4px_25px_rgba(0,0,0,0.4)] text-white"
                }`}
                style={!isActive ? {
                  textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.3)'
                } : undefined}
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

