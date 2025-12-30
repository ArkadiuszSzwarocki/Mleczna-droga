import React from 'react';

const MonthLabelPreviewModal: React.FC<{ data: { monthYear: string } }> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="p-1 border-2 border-black bg-white text-black font-sans w-[350px] mx-auto text-sm rounded-lg">
            <div className="p-4 flex items-center justify-center h-20">
                <p className="font-bold text-center text-3xl my-2 leading-tight">
                    {data.monthYear}
                </p>
            </div>
        </div>
    );
};

export default MonthLabelPreviewModal;