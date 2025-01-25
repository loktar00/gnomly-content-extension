import { forwardRef } from "react";
import { IoIosArrowBack } from "react-icons/io";

export const BackButton = forwardRef<HTMLButtonElement, { onClick?: () => void }>((props, ref) => {
    return (
        <button id="back-button" className="btn back-btn" ref={ref} {...props}>
            <IoIosArrowBack size={16} />
            Back
        </button>
    );
});