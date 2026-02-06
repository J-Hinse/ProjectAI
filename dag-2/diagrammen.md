erDiagram
    direction LR
    BOOK ||--o{ BORROW : "is borrowed in"
    MEMBER ||--o{ BORROW : "borrows"
    BOOK }|--|| CATEGORY : "belongs to"
    BOOK }|--|{ AUTHOR : "written by"

    BOOK {
        int book_id PK "Primary Key"
        string title
        string isbn UK "Unique Key"
        int publication_year
    }
    MEMBER {
        int member_id PK "Primary Key"
        string name
        string email UK "Unique Key"
        date membership_date
    }
    BORROW {
        int borrow_id PK "Primary Key"
        int book_id FK "Book borrowed"
        int member_id FK "Borrower"
        date borrow_date
        date return_date
    }
    CATEGORY {
        int category_id PK
        string name
    }
    AUTHOR {
        int author_id PK
        string name
    }

-------------------------------------------------------------------------------------------

sequenceDiagram
    participant Client
    participant API as Library API
    participant DB as Database

    %% User searches for books
    Client->>API: GET /books?title=...
    API->>DB: SELECT * FROM books WHERE title=...
    DB-->>API: Books data
    API-->>Client: Books JSON

    %% User borrows a book
    Client->>API: POST /borrow {book_id, member_id}
    API->>DB: INSERT INTO borrow (book_id, member_id, borrow_date)
    DB-->>API: Success/Fail
    API-->>Client: Borrow Confirmation

    %% User returns book
    Client->>API: POST /return {book_id, member_id}
    API->>DB: UPDATE borrow SET return_date=NOW() WHERE book_id=... AND member_id=...
    DB-->>API: Success/Fail
    API-->>Client: Return Confirmation

    -----------------------------------------------------------------------------------

block-beta
  columns 3
  Member(("User/Member"))
  Librarian(("Librarian"))
  space:1
  Search["Search Book"]
  Borrow["Borrow Book"]
  Return["Return Book"]
  ViewAccount["View Account"]
  Reserve["Reserve Book"]
  AddBook["Add Book"]
  RemoveBook["Remove Book"]
  ManageUsers["Manage Users"]
  Approve["Approve Registration"]
  ManageRes["Manage Reservations"]

  %% User/Member actions
  Member --> Search
  Member --> Borrow
  Member --> Return
  Member --> ViewAccount
  Member --> Reserve

  %% Librarian actions
  Librarian --> AddBook
  Librarian --> RemoveBook
  Librarian --> ManageUsers
  Librarian --> Approve
  Librarian --> ManageRes

  --------------------------------------------------------------------

  flowchart TD
    Book1["Book 1: <br>Title: The Great Gatsby<br>Author: F. Scott Fitzgerald<br>ISBN: 9780743273565"]
    Book2["Book 2: <br>Title: 1984<br>Author: George Orwell<br>ISBN: 9780451524935"]
    Book3["Book 3: <br>Title: To Kill a Mockingbird<br>Author: Harper Lee<br>ISBN: 9780446310789"]
    Book4["Book 4: <br>Title: The Catcher in the Rye<br>Author: J.D. Salinger<br>ISBN: 9780316769488"]

    BookList(["Library Books"])
    BookList --> Book1
    BookList --> Book2
    BookList --> Book3
    BookList --> Book4