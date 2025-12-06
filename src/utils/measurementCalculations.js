// Helper function to safely parse numbers
export const safeParseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

// Helper function to evaluate expressions
export const safeEvaluate = (expression) => {
  try {
    const validPattern = /^[0-9+\-*/.() ]+$/;
    if (!validPattern.test(expression)) {
      return 0;
    }

    let parenCount = 0;
    for (const char of expression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        return 0;
      }
    }
    if (parenCount !== 0) {
      return 0;
    }

    const result = new Function(`'use strict'; return (${expression})`)();

    if (result === Infinity || result === -Infinity || isNaN(result)) {
      return 0;
    }

    return parseFloat(result);
  } catch (error) {
    return 0;
  }
};

// Main function to calculate subtotal from attributes
export const calculateSubTotalFromAttributes = (prod, Attribute_data) => {
  if (!Attribute_data) return 0;

  // Find formula attribute
  const formulaAttr = Object.values(Attribute_data).find(
    (attr) => attr.Is_Formula === true
  );

  if (!formulaAttr) return 0;

  const formulaAttrId = formulaAttr.ID;

  // Get attribute values from the attribute object
  const productKey = Object.keys(prod.attribute || {})[0];
  const attrRows = prod.attribute?.[productKey] || [];

  if (attrRows.length === 0) return 0;

  let totalSubTotal = 0;

  // Iterate through each row
  attrRows.forEach((rowData) => {
    // Get the selected formula ID for this row
    const selectedFormulaId = rowData[formulaAttrId];

    if (!selectedFormulaId) return;

    // Find the formula from Masters (handle both array and object)
    const masters = Array.isArray(formulaAttr.Masters)
      ? formulaAttr.Masters
      : Object.values(formulaAttr.Masters || {});

    const selectedFormula = masters.find(
      (m) => String(m.ID) === String(selectedFormulaId)
    );

    if (!selectedFormula?.Calculation_Formula) return;

    let formula = selectedFormula.Calculation_Formula;

    // Extract attribute IDs from formula
    const attrIdMatches = formula.match(/Attr_(\d+)/g) || [];
    const attrIds = [...new Set(attrIdMatches.map(m => m.replace('Attr_', '')))];

    // Replace attributes with their values from rowData
    let expression = formula;
    attrIds.forEach((attrId) => {
      const value = rowData[attrId];
      const numValue = safeParseNumber(value);
      const replacementValue = numValue !== null ? numValue : 0;

      const attrPattern = new RegExp(`Attr_${attrId}\\b`, 'g');
      expression = expression.replace(attrPattern, `(${replacementValue})`);
    });

    // Calculate result
    const result = safeEvaluate(expression);
    if (!isNaN(result) && isFinite(result)) {
      totalSubTotal += result;
    }
  });

  return parseFloat(totalSubTotal.toFixed(2));
};