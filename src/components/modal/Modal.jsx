import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

import './modal.scss';

const Modal = props => {

    const [active, setActive] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        setActive(props.active);
    }, [props.active]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && active) {
                closeModal();
            }
        };

        const handleClickOutside = (e) => {
            if (modalRef.current && e.target === modalRef.current && active) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', handleClickOutside);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const closeModal = () => {
        if (modalRef.current) {
            modalRef.current.classList.remove('active');
            const modalContent = modalRef.current.querySelector('.modal__content');
            if (modalContent) {
                modalContent.innerHTML = '';
            }
        }
    };

    return createPortal(
        <div
            ref={modalRef}
            id={props.id}
            className={`modal ${active ? 'active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-hidden={!active}
        >
            {props.children}
        </div>,
        document.body,
    );
}

Modal.propTypes = {
    active: PropTypes.bool,
    id: PropTypes.string
}

export const ModalContent = props => {

    const contentRef = useRef(null);
    const closeClassName = [
        'modal__content__close',
        props.closeButtonClassName,
    ].filter(Boolean).join(' ');
    const contentClassName = [
        'modal__content',
        props.closeButtonClassName?.includes('modal__content__close--floating') && 'modal__content--floating-close',
    ].filter(Boolean).join(' ');

    const closeModal = () => {
        contentRef.current.parentNode.classList.remove('active');
        if (props.onClose) props.onClose();
    }

    return (
        <div ref={contentRef} className={contentClassName}>
            {props.children}
            <button type="button" className={closeClassName} onClick={closeModal} aria-label="Đóng modal">
                <i className="bx bx-x" aria-hidden="true"></i>
            </button>
        </div>
    );
}

ModalContent.propTypes = {
    onClose: PropTypes.func,
    closeButtonClassName: PropTypes.string
}

export default Modal
