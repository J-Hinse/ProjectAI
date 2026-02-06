// Simple in-memory REST API for a library system.
// Run with: npm install && npm start (from dag-2 folder)

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------------

const library = {
  books: [],
  members: [],
  borrows: [],
  categories: [],
  authors: [],
  reservations: []
};

let nextBookId = 1;
let nextMemberId = 1;
let nextBorrowId = 1;
let nextCategoryId = 1;
let nextAuthorId = 1;
let nextReservationId = 1;

// Seed some example data (based on diagrammen.md)
function seedData() {
  // Authors
  const author1 = { author_id: nextAuthorId++, name: "F. Scott Fitzgerald" };
  const author2 = { author_id: nextAuthorId++, name: "George Orwell" };
  const author3 = { author_id: nextAuthorId++, name: "Harper Lee" };
  const author4 = { author_id: nextAuthorId++, name: "J.D. Salinger" };

  library.authors.push(author1, author2, author3, author4);

  // Categories
  const fiction = { category_id: nextCategoryId++, name: "Fiction" };
  const classic = { category_id: nextCategoryId++, name: "Classic" };
  const dystopian = { category_id: nextCategoryId++, name: "Dystopian" };
  library.categories.push(fiction, classic, dystopian);

  // Books
  const book1 = {
    book_id: nextBookId++,
    title: "The Great Gatsby",
    isbn: "9780743273565",
    publication_year: 1925,
    category_ids: [fiction.category_id, classic.category_id],
    author_ids: [author1.author_id],
    total_copies: 3
  };
  const book2 = {
    book_id: nextBookId++,
    title: "1984",
    isbn: "9780451524935",
    publication_year: 1949,
    category_ids: [fiction.category_id, dystopian.category_id],
    author_ids: [author2.author_id],
    total_copies: 2
  };
  const book3 = {
    book_id: nextBookId++,
    title: "To Kill a Mockingbird",
    isbn: "9780446310789",
    publication_year: 1960,
    category_ids: [fiction.category_id, classic.category_id],
    author_ids: [author3.author_id],
    total_copies: 4
  };
  const book4 = {
    book_id: nextBookId++,
    title: "The Catcher in the Rye",
    isbn: "9780316769488",
    publication_year: 1951,
    category_ids: [fiction.category_id, classic.category_id],
    author_ids: [author4.author_id],
    total_copies: 1
  };

  library.books.push(book1, book2, book3, book4);

  // Example member
  const member = {
    member_id: nextMemberId++,
    name: "Alice Example",
    email: "alice@example.com",
    membership_date: new Date().toISOString().slice(0, 10),
    status: "active",
    role: "member"
  };

  library.members.push(member);
}

seedData();

// Helpers
function getBookById(id) {
  return library.books.find((b) => b.book_id === id);
}

function getMemberById(id) {
  return library.members.find((m) => m.member_id === id);
}

function countActiveBorrowsForBook(book_id) {
  return library.borrows.filter(
    (b) => b.book_id === book_id && b.return_date === null
  ).length;
}

function bookAvailableCopies(book_id) {
  const book = getBookById(book_id);
  if (!book) return 0;
  return book.total_copies - countActiveBorrowsForBook(book_id);
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

// GET /books?title=&author=&isbn=&category=&year=&available=
app.get("/books", (req, res) => {
  const { title, author, isbn, category, year, available } = req.query;

  let result = library.books.map((b) => ({
    ...b,
    categories: b.category_ids
      .map((cid) => library.categories.find((c) => c.category_id === cid))
      .filter(Boolean),
    authors: b.author_ids
      .map((aid) => library.authors.find((a) => a.author_id === aid))
      .filter(Boolean),
    available_copies: bookAvailableCopies(b.book_id)
  }));

  if (title) {
    const t = String(title).toLowerCase();
    result = result.filter((b) => b.title.toLowerCase().includes(t));
  }

  if (author) {
    const a = String(author).toLowerCase();
    result = result.filter((b) =>
      b.authors.some((au) => au.name.toLowerCase().includes(a))
    );
  }

  if (isbn) {
    result = result.filter((b) => b.isbn === String(isbn));
  }

  if (category) {
    const catLower = String(category).toLowerCase();
    result = result.filter((b) =>
      b.categories.some((c) => c.name.toLowerCase().includes(catLower))
    );
  }

  if (year) {
    const y = Number(year);
    result = result.filter((b) => b.publication_year === y);
  }

  if (available === "true") {
    result = result.filter((b) => b.available_copies > 0);
  } else if (available === "false") {
    result = result.filter((b) => b.available_copies <= 0);
  }

  res.json(result);
});

// GET /books/:id
app.get("/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const book = getBookById(id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const categories = book.category_ids
    .map((cid) => library.categories.find((c) => c.category_id === cid))
    .filter(Boolean);
  const authors = book.author_ids
    .map((aid) => library.authors.find((a) => a.author_id === aid))
    .filter(Boolean);

  res.json({
    ...book,
    categories,
    authors,
    available_copies: bookAvailableCopies(book.book_id)
  });
});

// POST /books
app.post("/books", (req, res) => {
  const {
    title,
    isbn,
    publication_year,
    category_ids = [],
    author_ids = [],
    total_copies = 1
  } = req.body || {};

  if (!title || !isbn || !publication_year) {
    return res
      .status(400)
      .json({ error: "title, isbn and publication_year are required" });
  }

  if (library.books.some((b) => b.isbn === isbn)) {
    return res.status(409).json({ error: "Book with this ISBN already exists" });
  }

  const book = {
    book_id: nextBookId++,
    title,
    isbn,
    publication_year,
    category_ids,
    author_ids,
    total_copies
  };

  library.books.push(book);
  res.status(201).json(book);
});

// PATCH /books/:id
app.patch("/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const book = getBookById(id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const { title, isbn, publication_year, category_ids, author_ids, total_copies } =
    req.body || {};

  if (isbn && isbn !== book.isbn) {
    if (library.books.some((b) => b.isbn === isbn)) {
      return res.status(409).json({ error: "Another book with this ISBN exists" });
    }
    book.isbn = isbn;
  }

  if (title !== undefined) book.title = title;
  if (publication_year !== undefined) book.publication_year = publication_year;
  if (Array.isArray(category_ids)) book.category_ids = category_ids;
  if (Array.isArray(author_ids)) book.author_ids = author_ids;
  if (total_copies !== undefined) book.total_copies = total_copies;

  res.json(book);
});

// DELETE /books/:id
app.delete("/books/:id", (req, res) => {
  const id = Number(req.params.id);
  const book = getBookById(id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const hasActiveBorrow = library.borrows.some(
    (b) => b.book_id === id && b.return_date === null
  );
  if (hasActiveBorrow) {
    return res
      .status(409)
      .json({ error: "Cannot delete book with active borrows" });
  }

  library.books = library.books.filter((b) => b.book_id !== id);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

// POST /members
app.post("/members", (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  if (library.members.some((m) => m.email === email)) {
    return res.status(409).json({ error: "Member with this email already exists" });
  }

  const member = {
    member_id: nextMemberId++,
    name,
    email,
    membership_date: new Date().toISOString().slice(0, 10),
    status: "active",
    role: "member"
  };

  library.members.push(member);
  res.status(201).json(member);
});

// GET /members
app.get("/members", (req, res) => {
  const { email, name, active } = req.query;
  let result = [...library.members];

  if (email) {
    const e = String(email).toLowerCase();
    result = result.filter((m) => m.email.toLowerCase().includes(e));
  }
  if (name) {
    const n = String(name).toLowerCase();
    result = result.filter((m) => m.name.toLowerCase().includes(n));
  }
  if (active === "true") {
    result = result.filter((m) => m.status === "active");
  } else if (active === "false") {
    result = result.filter((m) => m.status !== "active");
  }

  res.json(result);
});

// GET /members/:id
app.get("/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const member = getMemberById(id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});

// PATCH /members/:id
app.patch("/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const member = getMemberById(id);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const { name, email, status, role } = req.body || {};

  if (email && email !== member.email) {
    if (library.members.some((m) => m.email === email)) {
      return res.status(409).json({ error: "Another member with this email exists" });
    }
    member.email = email;
  }

  if (name !== undefined) member.name = name;
  if (status !== undefined) member.status = status;
  if (role !== undefined) member.role = role;

  res.json(member);
});

// GET /members/:id/borrows
app.get("/members/:id/borrows", (req, res) => {
  const id = Number(req.params.id);
  const member = getMemberById(id);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const { active } = req.query;
  let result = library.borrows.filter((b) => b.member_id === id);

  if (active === "true") {
    result = result.filter((b) => b.return_date === null);
  } else if (active === "false") {
    result = result.filter((b) => b.return_date !== null);
  }

  // Attach book info
  result = result.map((b) => ({
    ...b,
    book: getBookById(b.book_id)
  }));

  res.json(result);
});

// GET /members/:id/reservations
app.get("/members/:id/reservations", (req, res) => {
  const id = Number(req.params.id);
  const member = getMemberById(id);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const result = library.reservations
    .filter((r) => r.member_id === id)
    .map((r) => ({
      ...r,
      book: getBookById(r.book_id)
    }));

  res.json(result);
});

// ---------------------------------------------------------------------------
// Borrows (Borrow & Return)
// ---------------------------------------------------------------------------

// POST /borrows  (Borrow book)
app.post("/borrows", (req, res) => {
  const { book_id, member_id } = req.body || {};

  if (!book_id || !member_id) {
    return res.status(400).json({ error: "book_id and member_id are required" });
  }

  const book = getBookById(book_id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const member = getMemberById(member_id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  if (member.status !== "active") {
    return res.status(400).json({ error: "Member is not active" });
  }

  if (bookAvailableCopies(book_id) <= 0) {
    return res.status(409).json({ error: "No available copies for this book" });
  }

  const borrow = {
    borrow_id: nextBorrowId++,
    book_id,
    member_id,
    borrow_date: new Date().toISOString().slice(0, 10),
    return_date: null
  };

  library.borrows.push(borrow);
  res.status(201).json(borrow);
});

// POST /returns  (Return book by book_id + member_id)
app.post("/returns", (req, res) => {
  const { book_id, member_id } = req.body || {};

  if (!book_id || !member_id) {
    return res.status(400).json({ error: "book_id and member_id are required" });
  }

  const borrow = library.borrows.find(
    (b) => b.book_id === book_id && b.member_id === member_id && b.return_date === null
  );

  if (!borrow) {
    return res.status(404).json({ error: "Active borrow not found" });
  }

  borrow.return_date = new Date().toISOString().slice(0, 10);
  res.json(borrow);
});

// GET /borrows
app.get("/borrows", (req, res) => {
  const { member_id, book_id, status } = req.query;
  let result = [...library.borrows];

  if (member_id) {
    const mid = Number(member_id);
    result = result.filter((b) => b.member_id === mid);
  }
  if (book_id) {
    const bid = Number(book_id);
    result = result.filter((b) => b.book_id === bid);
  }
  if (status === "active") {
    result = result.filter((b) => b.return_date === null);
  } else if (status === "returned") {
    result = result.filter((b) => b.return_date !== null);
  }

  result = result.map((b) => ({
    ...b,
    book: getBookById(b.book_id),
    member: getMemberById(b.member_id)
  }));

  res.json(result);
});

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

// POST /reservations
app.post("/reservations", (req, res) => {
  const { book_id, member_id } = req.body || {};

  if (!book_id || !member_id) {
    return res.status(400).json({ error: "book_id and member_id are required" });
  }

  const book = getBookById(book_id);
  if (!book) return res.status(404).json({ error: "Book not found" });

  const member = getMemberById(member_id);
  if (!member) return res.status(404).json({ error: "Member not found" });

  const existing = library.reservations.find(
    (r) =>
      r.book_id === book_id &&
      r.member_id === member_id &&
      r.status === "active"
  );
  if (existing) {
    return res
      .status(409)
      .json({ error: "Active reservation for this book already exists" });
  }

  const reservation = {
    reservation_id: nextReservationId++,
    book_id,
    member_id,
    reservation_date: new Date().toISOString().slice(0, 10),
    status: "active"
  };

  library.reservations.push(reservation);
  res.status(201).json(reservation);
});

// GET /reservations
app.get("/reservations", (req, res) => {
  const { member_id, book_id, status } = req.query;
  let result = [...library.reservations];

  if (member_id) {
    const mid = Number(member_id);
    result = result.filter((r) => r.member_id === mid);
  }
  if (book_id) {
    const bid = Number(book_id);
    result = result.filter((r) => r.book_id === bid);
  }
  if (status) {
    result = result.filter((r) => r.status === status);
  }

  result = result.map((r) => ({
    ...r,
    book: getBookById(r.book_id),
    member: getMemberById(r.member_id)
  }));

  res.json(result);
});

// PATCH /reservations/:id
app.patch("/reservations/:id", (req, res) => {
  const id = Number(req.params.id);
  const reservation = library.reservations.find(
    (r) => r.reservation_id === id
  );
  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found" });
  }

  const { status } = req.body || {};
  if (status) reservation.status = status;

  res.json(reservation);
});

// DELETE /reservations/:id
app.delete("/reservations/:id", (req, res) => {
  const id = Number(req.params.id);
  const reservation = library.reservations.find(
    (r) => r.reservation_id === id
  );
  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found" });
  }

  reservation.status = "cancelled";
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Authors & Categories
// ---------------------------------------------------------------------------

app.get("/authors", (req, res) => {
  res.json(library.authors);
});

app.get("/authors/:id", (req, res) => {
  const id = Number(req.params.id);
  const author = library.authors.find((a) => a.author_id === id);
  if (!author) return res.status(404).json({ error: "Author not found" });
  res.json(author);
});

app.get("/authors/:id/books", (req, res) => {
  const id = Number(req.params.id);
  const author = library.authors.find((a) => a.author_id === id);
  if (!author) return res.status(404).json({ error: "Author not found" });

  const books = library.books.filter((b) => b.author_ids.includes(id));
  res.json(books);
});

app.get("/categories", (req, res) => {
  res.json(library.categories);
});

app.get("/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  const category = library.categories.find((c) => c.category_id === id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(category);
});

app.get("/categories/:id/books", (req, res) => {
  const id = Number(req.params.id);
  const category = library.categories.find((c) => c.category_id === id);
  if (!category) return res.status(404).json({ error: "Category not found" });

  const books = library.books.filter((b) => b.category_ids.includes(id));
  res.json(books);
});

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Library API running",
    endpoints: [
      "GET /books",
      "GET /books/:id",
      "POST /books",
      "PATCH /books/:id",
      "DELETE /books/:id",
      "POST /members",
      "GET /members",
      "GET /members/:id",
      "PATCH /members/:id",
      "GET /members/:id/borrows",
      "GET /members/:id/reservations",
      "POST /borrows",
      "POST /returns",
      "GET /borrows",
      "POST /reservations",
      "GET /reservations",
      "PATCH /reservations/:id",
      "DELETE /reservations/:id",
      "GET /authors",
      "GET /authors/:id",
      "GET /authors/:id/books",
      "GET /categories",
      "GET /categories/:id",
      "GET /categories/:id/books"
    ]
  });
});

// ---------------------------------------------------------------------------
// Start server (only when run directly)
// ---------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Library API listening on http://localhost:${PORT}`);
  });
}

// Export app for integration tests
module.exports = app;