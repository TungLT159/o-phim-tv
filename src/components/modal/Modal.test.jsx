import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Modal, { ModalContent } from "./Modal";

test("renders modal outside parent stacking contexts", () => {
  const { container } = render(
    <div className="stacking-parent">
      <Modal active id="test_modal">
        <p>Trailer content</p>
      </Modal>
    </div>,
  );

  const modal = screen.getByText("Trailer content").closest(".modal");

  expect(container.querySelector(".stacking-parent .modal")).not.toBeInTheDocument();
  expect(modal?.parentElement).toBe(document.body);
});

test("supports an elevated close button style for trailer playback", () => {
  render(
    <Modal active id="test_trailer_modal">
      <ModalContent closeButtonClassName="modal__content__close--floating">
        <div className="trailer-container">Trailer player</div>
      </ModalContent>
    </Modal>,
  );

  expect(screen.getByLabelText("Đóng modal")).toHaveClass(
    "modal__content__close--floating",
  );
  expect(screen.getByText("Trailer player").closest(".modal__content")).toHaveClass(
    "modal__content--floating-close",
  );
});
