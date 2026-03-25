const ExcelJS = require('exceljs');

/**
 * ExcelLogicChecker
 * This module compares a student's spreadsheet against a reference template.
 * It checks not only the values but also the formulas used.
 */
class ExcelLogicChecker {
    /**
     * @param {string} studentFilePath Path to the student's .xlsx file
     * @param {string} templateFilePath Path to the teacher's reference .xlsx file
     */
    async analyze(studentFilePath, templateFilePath) {
        const studentWorkbook = new ExcelJS.Workbook();
        const templateWorkbook = new ExcelJS.Workbook();

        await studentWorkbook.xlsx.readFile(studentFilePath);
        await templateWorkbook.xlsx.readFile(templateFilePath);

        const report = {
            matches: [],
            errors: [],
            totalScore: 0,
            maxScore: 0,
            timestamp: new Date().toISOString()
        };

        // Comparison strategy: Compare each sheet in the template with corresponding sheet in student file
        templateWorkbook.eachSheet((templateSheet, id) => {
            const studentSheet = studentWorkbook.getWorksheet(templateSheet.name);
            
            if (!studentSheet) {
                report.errors.push(`Arkusz "${templateSheet.name}" nie został znaleziony w pliku ucznia.`);
                return;
            }

            // Iterate over all cells that have values in the template
            templateSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    const studentCell = studentSheet.getCell(rowNumber, colNumber);
                    
                    // We assume any cell in the template is a "requirement"
                    // If the cell contains a formula, we check the formula.
                    // If it contains a value, we check the value.
                    
                    const cellResult = this.compareCells(cell, studentCell);
                    
                    report.maxScore += 1;
                    if (cellResult.isCorrect) {
                        report.totalScore += 1;
                    }
                    
                    report.matches.push({
                        sheet: templateSheet.name,
                        address: cell.address,
                        expected: {
                            value: cell.value,
                            type: cell.type,
                            formula: cell.formula
                        },
                        student: {
                            value: studentCell.value,
                            type: studentCell.type,
                            formula: studentCell.formula
                        },
                        isCorrect: cellResult.isCorrect,
                        note: cellResult.note
                    });
                });
            });
        });

        return report;
    }

    /**
     * Internal cell comparison logic
     */
    compareCells(templateCell, studentCell) {
        // 1. Formula Check (If template has formula, student MUST have logic)
        if (templateCell.formula || (templateCell.value && typeof templateCell.value === 'object' && templateCell.value.formula)) {
            const templateFormula = templateCell.formula || templateCell.value.formula;
            const studentFormula = studentCell.formula || (studentCell.value && studentCell.value.formula);

            if (!studentFormula) {
                return { isCorrect: false, note: "Brak formuły (wpisano wartość 'z palca')." };
            }

            // Normalizing formulas (removing spaces, lowercase)
            const normTemplate = templateFormula.replace(/\s/g, '').toLowerCase();
            const normStudent = studentFormula.replace(/\s/g, '').toLowerCase();

            if (normTemplate !== normStudent) {
                // Check if the result value matches even if formula is different (e.g. nested vs simple)
                // But in logic checking, we might want strict formula matching
                return { isCorrect: false, note: `Błędna formuła. Oczekiwano: ${templateFormula}` };
            }
        }

        // 2. Value Check (Result Comparison)
        // Note: ExcelJS 'value' for formulas is the result object.
        const templateVal = this.getEffectiveValue(templateCell);
        const studentVal = this.getEffectiveValue(studentCell);

        if (templateVal != studentVal) {
            return { isCorrect: false, note: `Błędny wynik. Oczekiwano: ${templateVal}, otrzymano: ${studentVal}` };
        }

        return { isCorrect: true, note: "Prawidłowo" };
    }

    getEffectiveValue(cell) {
        if (!cell.value) return null;
        if (typeof cell.value === 'object' && cell.value.result !== undefined) {
            return cell.value.result;
        }
        return cell.value;
    }
}

module.exports = ExcelLogicChecker;
