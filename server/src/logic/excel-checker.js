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
        templateWorkbook.eachSheet((templateSheet, id) => {
            const studentSheet = studentWorkbook.getWorksheet(templateSheet.name);
            if (!studentSheet) {
                report.errors.push(`Arkusz "${templateSheet.name}" nie został znaleziony w pliku ucznia.`);
                return;
            }
            templateSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    const studentCell = studentSheet.getCell(rowNumber, colNumber);
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
        if (templateCell.font && templateCell.font.bold && (!studentCell.font || !studentCell.font.bold)) {
            return { isCorrect: false, note: "Brak pogrubienia czcionki." };
        }
        if (templateCell.formula || (templateCell.value && typeof templateCell.value === 'object' && templateCell.value.formula)) {
            const templateFormula = templateCell.formula || templateCell.value.formula;
            const studentFormula = studentCell.formula || (studentCell.value && studentCell.value.formula);
            if (!studentFormula) {
                return { isCorrect: false, note: "Brak formuły (wpisano wartość 'z palca')." };
            }
            const normalize = (f) => f.replace(/\s/g, '').replace(/\$/g, '').toLowerCase();
            const normTemplate = normalize(templateFormula);
            const normStudent = normalize(studentFormula);
            if (normTemplate !== normStudent) {
                const templateFunc = normTemplate.split('(')[0];
                const studentFunc = normStudent.split('(')[0];
                if (templateFunc !== studentFunc) {
                    return { isCorrect: false, note: `Użyto złej funkcji. Oczekiwano: ${templateFunc.toUpperCase()}` };
                }
                return { isCorrect: false, note: `Błędne argumenty w formule ${templateFunc.toUpperCase()}.` };
            }
        }
        const templateVal = this.getEffectiveValue(templateCell);
        const studentVal = this.getEffectiveValue(studentCell);
        if (templateVal != studentVal) {
            if (typeof templateVal === 'number' && typeof studentVal === 'number') {
                if (Math.abs(templateVal - studentVal) < 0.01) return { isCorrect: true, note: "Prawidłowo (z zaokrągleniem)" };
            }
            return { isCorrect: false, note: `Błędny wynik. Oczekiwano: ${templateVal}` };
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
