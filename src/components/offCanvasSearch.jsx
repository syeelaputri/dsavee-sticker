import React from "react";

export default function OffcanvasSearch() {
  return (
    <div
      className="offcanvas offcanvas-end"
      data-bs-scroll="true"
      tabIndex="-1"
      id="offcanvasSearch"
      aria-labelledby="Search"
    >
      <div className="offcanvas-header justify-content-center">
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body">
        <div className="order-md-last">
          <h4 className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-primary">Search</span>
          </h4>
          <form
            role="search"
            action="/"
            method="get"
            className="d-flex mt-3 gap-0"
          >
            <input
              className="form-control rounded-start rounded-0 bg-light"
              name="q"
              type="search"
              placeholder="What are you looking for?"
              aria-label="What are you looking for?"
            />
            <button
              className="btn btn-dark rounded-end rounded-0"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
