const request = require("supertest");
const app = require("../script");

describe("Library API integration tests", () => {
  // Root endpoint
  it("GET / should return API info", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

  // Books
  it("GET /books should return seeded books", async () => {
    const res = await request(app).get("/books");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    const titles = res.body.map((b) => b.title);
    expect(titles).toContain("1984");
  });

  it("POST /books should create a new book", async () => {
    const payload = {
      title: "New Test Book",
      isbn: "TEST-ISBN-123",
      publication_year: 2020,
      total_copies: 2
    };
    const res = await request(app).post("/books").send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: payload.title,
      isbn: payload.isbn,
      publication_year: payload.publication_year,
      total_copies: payload.total_copies
    });
    expect(res.body).toHaveProperty("book_id");
  });

  // Members
  it("POST /members should create a member", async () => {
    const payload = { name: "Test User", email: "testuser@example.com" };
    const res = await request(app).post("/members").send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: payload.name,
      email: payload.email,
      status: "active"
    });
    expect(res.body).toHaveProperty("member_id");
  });

  // Borrow and return flow
  it("should allow a member to borrow and return a book", async () => {
    // Get one book
    const booksRes = await request(app).get("/books");
    expect(booksRes.status).toBe(200);
    const book = booksRes.body[0];
    expect(book).toBeDefined();

    // Create a new member for this test
    const memberRes = await request(app)
      .post("/members")
      .send({ name: "Borrower", email: "borrower@example.com" });
    expect(memberRes.status).toBe(201);
    const memberId = memberRes.body.member_id;

    // Borrow
    const borrowRes = await request(app)
      .post("/borrows")
      .send({ book_id: book.book_id, member_id: memberId });
    expect(borrowRes.status).toBe(201);
    expect(borrowRes.body).toMatchObject({
      book_id: book.book_id,
      member_id: memberId,
      return_date: null
    });

    // Member borrows listing should show this borrow
    const memberBorrowsRes = await request(app).get(
      `/members/${memberId}/borrows?active=true`
    );
    expect(memberBorrowsRes.status).toBe(200);
    const activeBorrow = memberBorrowsRes.body.find(
      (b) => b.book_id === book.book_id
    );
    expect(activeBorrow).toBeDefined();

    // Return
    const returnRes = await request(app)
      .post("/returns")
      .send({ book_id: book.book_id, member_id: memberId });
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.return_date).not.toBeNull();

    // No more active borrow for this book/member
    const afterReturnRes = await request(app).get(
      `/members/${memberId}/borrows?active=true`
    );
    expect(afterReturnRes.status).toBe(200);
    const stillActive = afterReturnRes.body.find(
      (b) => b.book_id === book.book_id
    );
    expect(stillActive).toBeUndefined();
  });

  // Reservations
  it("should allow creating and listing reservations", async () => {
    // Get one book
    const booksRes = await request(app).get("/books");
    expect(booksRes.status).toBe(200);
    const book = booksRes.body[1];
    expect(book).toBeDefined();

    // Create a new member for reservation
    const memberRes = await request(app)
      .post("/members")
      .send({ name: "Reserver", email: "reserver@example.com" });
    expect(memberRes.status).toBe(201);
    const memberId = memberRes.body.member_id;

    // Create reservation
    const resCreate = await request(app)
      .post("/reservations")
      .send({ book_id: book.book_id, member_id: memberId });
    expect(resCreate.status).toBe(201);
    const reservationId = resCreate.body.reservation_id;

    // Member's reservations should contain it
    const memberResList = await request(app).get(
      `/members/${memberId}/reservations`
    );
    expect(memberResList.status).toBe(200);
    const created = memberResList.body.find(
      (r) => r.reservation_id === reservationId
    );
    expect(created).toBeDefined();

    // Global reservations list should also contain it
    const resList = await request(app).get(
      `/reservations?member_id=${memberId}`
    );
    expect(resList.status).toBe(200);
    const inGlobal = resList.body.find(
      (r) => r.reservation_id === reservationId
    );
    expect(inGlobal).toBeDefined();
  });
});

