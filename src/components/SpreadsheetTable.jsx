import React, { useState, useCallback } from 'react';

const SpreadsheetTable = ({ 
  columns, 
  data, 
  onCellChange, 
  onRowAdd, 
  onRowDelete,
  editable = false,
  showRowNumbers = true,
  className = '' 
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = useCallback((rowIndex, colKey) => {
    if (!editable) return;
    
    setEditingCell({ rowIndex, colKey });
    setEditValue(data[rowIndex][colKey] || '');
  }, [editable, data]);

  const handleCellBlur = useCallback(() => {
    if (editingCell && onCellChange) {
      onCellChange(editingCell.rowIndex, editingCell.colKey, editValue);
    }
    setEditingCell(null);
  }, [editingCell, editValue, onCellChange]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }, [handleCellBlur]);

  const renderCell = (row, column, rowIndex) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colKey === column.key;
    const value = row[column.key];

    if (isEditing) {
      return (
        <input
          type={column.type || 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={handleKeyPress}
          className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoFocus
        />
      );
    }

    if (column.render) {
      return column.render(value, row, rowIndex);
    }

    return (
      <div 
        className={`px-2 py-1 ${editable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
        onClick={() => handleCellClick(rowIndex, column.key)}
      >
        {value || ''}
      </div>
    );
  };

  return (
    <div className={`overflow-auto border border-gray-300 rounded-lg ${className}`}>
      <table className="w-full border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {showRowNumbers && (
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 min-w-12">
                #
              </th>
            )}
            {columns.map((column) => (
              <th 
                key={column.key}
                className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-700 min-w-24"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {editable && (
              <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 min-w-16">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {showRowNumbers && (
                <td className="border border-gray-300 px-2 py-1 text-center text-sm text-gray-600 bg-gray-50">
                  {rowIndex + 1}
                </td>
              )}
              {columns.map((column) => (
                <td 
                  key={`${rowIndex}-${column.key}`}
                  className="border border-gray-300 text-sm"
                >
                  {renderCell(row, column, rowIndex)}
                </td>
              ))}
              {editable && (
                <td className="border border-gray-300 px-2 py-1 text-center">
                  <button
                    onClick={() => onRowDelete?.(rowIndex)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="p-2 border-t border-gray-300">
          <button
            onClick={onRowAdd}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            行を追加
          </button>
        </div>
      )}
    </div>
  );
};

export default SpreadsheetTable;