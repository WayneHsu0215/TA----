import React from 'react';

function Header({ Id, setId, handleSearch }) {
    return (
        <div className="p-4 flex justify-between items-center bg-blue-600">
            <h1 className="text-3xl text-white">使用者管理</h1>
            <div className="flex items-center">
                <input
                    type="text"
                    value={Id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Search by ID"
                    className="border p-2 rounded-l"
                />
                <button onClick={handleSearch} className="bg-blue-100 ml-4 text-white px-4 py-3 rounded-lg">
                    <div className="text-black">查詢</div>
                </button>
            </div>
        </div>
    );
}

export default Header;
