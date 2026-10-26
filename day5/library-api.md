# Library Books REST API Documentation

This document describes the RESTful API for managing a library's `books` resource. All requests and responses use JSON formatting where applicable (`Content-Type: application/json`).

---

## Base URL

`/api/v1`

---

## Endpoints

### 1. List All Books
- **Method:** `GET`
- **Path:** `/books`
- **Description:** Retrieve a list of all books in the library catalog.
- **Request Body:** None
- **Success Status Code:** `200 OK`

---

### 2. Get One Book
- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Retrieve detailed information for a single book by its unique ID.
- **Request Body:** None
- **Success Status Code:** `200 OK`

---

### 3. Create a Book
- **Method:** `POST`
- **Path:** `/books`
- **Description:** Add a new book to the library catalog.
- **Request Body:**
  ```json
  {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "publishedYear": 2008,
    "genre": "Software Engineering"
  }
  ```
- **Success Status Code:** `201 Created`

---

### 4. Update a Book
- **Method:** `PUT`
- **Path:** `/books/{id}`
- **Description:** Replace or update an existing book's details by its ID.
- **Request Body:**
  ```json
  {
    "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "publishedYear": 2008,
    "genre": "Software Engineering"
  }
  ```
- **Success Status Code:** `200 OK`

---

### 5. Delete a Book
- **Method:** `DELETE`
- **Path:** `/books/{id}`
- **Description:** Remove a book permanently from the library catalog.
- **Request Body:** None
- **Success Status Code:** `204 No Content`

---

### 6. List Books by Author
- **Method:** `GET`
- **Path:** `/books?author={authorName}`
- **Description:** Filter and retrieve books written by a specific author using a query parameter.
- **Request Body:** None
- **Success Status Code:** `200 OK`

---

## Error Codes

The API uses standard HTTP error status codes to communicate client request issues:

- **`400 Bad Request`**:
  - **Description:** Occurs when the server cannot process the request due to invalid client syntax, missing mandatory fields, or malformed JSON payloads.
  - **Example Scenario:** Sending a `POST /books` request missing the required `title` field, or sending non-numeric characters for `publishedYear` (e.g. `{"publishedYear": "twenty-twenty"}`).

- **`404 Not Found`**:
  - **Description:** Occurs when the requested book resource does not exist in the catalog.
  - **Example Scenario:** Sending a `GET /books/99999` or `DELETE /books/99999` request when no book with ID `99999` exists in the database.
