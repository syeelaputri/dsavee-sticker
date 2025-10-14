import React from "react";

export default function Footer() {
  return (
    <>
      <footer className="py-5">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-md-6 col-sm-6">
              <div className="footer-menu">
                <img src="/images/logo.png" alt="logo" />
              </div>
            </div>
            {/* Tambah kolom contact/info sesuai desain Anda */}
          </div>
        </div>
      </footer>
      <div id="footer-bottom">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6 copyright">
              <p>© 2023 Foodmart. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
