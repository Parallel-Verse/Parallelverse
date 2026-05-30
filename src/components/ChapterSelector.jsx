const uniqueBooks = (chapters) => [...new Set(chapters.map((chapter) => chapter.book))];

export default function ChapterSelector({
  chapters,
  selectedBook,
  selectedChapter,
  onBookChange,
  onChapterChange,
}) {
  const books = uniqueBooks(chapters);
  const availableChapters = chapters.filter((chapter) => chapter.book === selectedBook);

  return (
    <form className="chapter-selector" aria-label="Scripture navigation">
      <label>
        <span>Book</span>
        <select value={selectedBook} onChange={(event) => onBookChange(event.target.value)}>
          {books.map((book) => (
            <option key={book} value={book}>
              {book}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Chapter</span>
        <select value={selectedChapter} onChange={(event) => onChapterChange(event.target.value)}>
          {availableChapters.map((chapter) => (
            <option key={`${chapter.book}-${chapter.chapter}`} value={chapter.chapter}>
              {chapter.chapter}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
