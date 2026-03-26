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
                    report.totalScore += cellResult.score;

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
        let score = 0;
        let isCorrect = false;

        if (templateCell.font && templateCell.font.bold && (!studentCell.font || !studentCell.font.bold)) {
            return { score: 0, isCorrect: false, note: "Brak pogrubienia czcionki." };
        }

        const templateFormula = templateCell.formula || (templateCell.value && templateCell.value.formula);
        const studentFormula = studentCell.formula || (studentCell.value && studentCell.value.formula);

        if (templateFormula) {
            if (!studentFormula) {
                return { score: 0, isCorrect: false, note: "Brak formuły (wpisano wartość 'z palca')." };
            }
            const normalize = (f) => f.replace(/\s/g, '').replace(/\$/g, '').toLowerCase();
            const normTemplate = normalize(templateFormula);
            const normStudent = normalize(studentFormula);

            if (normTemplate !== normStudent) {
                const templateFunc = normTemplate.split('(')[0];
                const studentFunc = normStudent.split('(')[0];
                if (templateFunc !== studentFunc) {
                    return { score: 0, isCorrect: false, note: `Użyto złej funkcji. Oczekiwano: ${templateFunc.toUpperCase()}` };
                }
                return { score: 0, isCorrect: false, note: `Błędne argumenty w formule ${templateFunc.toUpperCase()}.` };
            }
            // Formula is correct at this point
            score = 0.5;
        }

        const templateVal = this.getEffectiveValue(templateCell);
        const studentVal = this.getEffectiveValue(studentCell);

        if (templateVal != studentVal) {
            if (typeof templateVal === 'number' && typeof studentVal === 'number') {
                if (Math.abs(templateVal - studentVal) < 0.01) {
                    return { score: 1, isCorrect: true, note: "Prawidłowo (z zaokrągleniem)" };
                }
            }
            if (templateFormula) {
                return { score: 0.5, isCorrect: false, note: `Błędny wynik, ale formuła poprawna. Oczekiwano: ${templateVal}` };
            }
            return { score: 0, isCorrect: false, note: `Błędny wynik. Oczekiwano: ${templateVal}` };
        }

        return { score: 1, isCorrect: true, note: "Prawidłowo" };
    }
    getEffectiveValue(cell) {
        if (!cell.value) return null;
        if (typeof cell.value === 'object' && cell.value.result !== undefined) {
            return cell.value.result;
        }
        return cell.value;
    }

    /**
     * Detects plagiarism between two student workbooks.
     * Compares formulas and values across all sheets.
     */
    async detectPlagiarism(file1, file2) {
        const wb1 = new ExcelJS.Workbook();
        const wb2 = new ExcelJS.Workbook();
        await wb1.xlsx.readFile(file1);
        await wb2.xlsx.readFile(file2);

        let matches = 0;
        let totalCells = 0;

        wb1.eachSheet((sheet1) => {
            const sheet2 = wb2.getWorksheet(sheet1.name);
            if (!sheet2) return;

            sheet1.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                row.eachCell({ includeEmpty: false }, (cell1, colNumber) => {
                    const cell2 = sheet2.getCell(rowNumber, colNumber);
                    if (!cell2.value) return;

                    totalCells++;
                    const f1 = cell1.formula || (cell1.value && cell1.value.formula);
                    const f2 = cell2.formula || (cell2.value && cell2.value.formula);

                    if (f1 && f2) {
                        if (f1.replace(/\s/g, '') === f2.replace(/\s/g, '')) matches++;
                    } else if (!f1 && !f2) {
                        if (this.getEffectiveValue(cell1) == this.getEffectiveValue(cell2)) matches++;
                    }
                });
            });
        });

        const ratio = totalCells > 0 ? (matches / totalCells) : 0;
        return {
            ratio: ratio,
            isPlagiarism: ratio > 0.9,
            matchCount: matches,
            totalChecked: totalCells
        };
    }
}
module.exports = ExcelLogicChecker;
