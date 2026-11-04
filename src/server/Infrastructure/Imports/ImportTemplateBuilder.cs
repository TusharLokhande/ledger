using Core.Features.Imports.Interfaces;
using Core.Features.Imports.Services;
using OfficeOpenXml;
using OfficeOpenXml.DataValidation;
using OfficeOpenXml.DataValidation.Contracts;

namespace Infrastructure.Imports;

public class ImportTemplateBuilder : IImportTemplateBuilder
{
    public static readonly string[] Types = ["Expense", "Income", "Transfer"];
    private const int LastRow = ImportLimits.MaxRows + 1;

    public byte[] Build(IReadOnlyList<string> accountNames, IReadOnlyList<string> categoryNames)
    {
        using var package = new ExcelPackage();
        var sheet = package.Workbook.Worksheets.Add("Transactions");
        var lists = package.Workbook.Worksheets.Add("Lists");

        // Dropdown sources live on a hidden sheet so long lists aren't limited by Excel's 255-char inline list.
        lists.Cells[1, 1].Value = "Types";
        lists.Cells[1, 2].Value = "Accounts";
        lists.Cells[1, 3].Value = "Categories";
        WriteColumn(lists, 1, Types);
        WriteColumn(lists, 2, accountNames);
        WriteColumn(lists, 3, categoryNames);
        lists.Hidden = eWorkSheetHidden.Hidden;

        for (var c = 0; c < ImportLimits.Columns.Length; c++)
            sheet.Cells[1, c + 1].Value = ImportLimits.Columns[c];
        sheet.Cells[1, 1, 1, ImportLimits.Columns.Length].Style.Font.Bold = true;
        sheet.View.FreezePanes(2, 1);
        sheet.Cells[1, 5].AddComment("Transfers only: the account the money goes to. Leave Category blank for transfers.", "Ledger");

        sheet.Cells[$"A2:A{LastRow}"].Style.Numberformat.Format = "dd-mm-yyyy";
        sheet.Cells[$"C2:C{LastRow}"].Style.Numberformat.Format = "#,##0.00##";

        var date = sheet.DataValidations.AddDateTimeValidation($"A2:A{LastRow}");
        date.Operator = ExcelDataValidationOperator.greaterThan;
        date.Formula.Value = new DateTime(1900, 1, 1);
        Stop(date, "Enter a date, e.g. 04-11-2026.");

        AddList(sheet, $"B2:B{LastRow}", $"Lists!$A$2:$A${Types.Length + 1}", "Choose Expense, Income or Transfer.");

        var amount = sheet.DataValidations.AddDecimalValidation($"C2:C{LastRow}");
        amount.Operator = ExcelDataValidationOperator.greaterThan;
        amount.Formula.Value = 0;
        Stop(amount, "Enter an amount greater than 0.");

        var accountsRange = $"Lists!$B$2:$B${Math.Max(accountNames.Count, 1) + 1}";
        AddList(sheet, $"D2:D{LastRow}", accountsRange, "Choose one of your accounts.");
        AddList(sheet, $"E2:E{LastRow}", accountsRange, "Choose one of your accounts.");
        AddList(sheet, $"F2:F{LastRow}", $"Lists!$C$2:$C${Math.Max(categoryNames.Count, 1) + 1}", "Choose one of your categories.");

        double[] widths = [14, 12, 14, 22, 22, 22, 40];
        for (var c = 0; c < widths.Length; c++)
            sheet.Column(c + 1).Width = widths[c];

        return package.GetAsByteArray();
    }

    private static void WriteColumn(ExcelWorksheet sheet, int column, IReadOnlyList<string> values)
    {
        for (var i = 0; i < values.Count; i++)
            sheet.Cells[i + 2, column].Value = values[i];
    }

    private static void AddList(ExcelWorksheet sheet, string address, string source, string error)
    {
        var list = sheet.DataValidations.AddListValidation(address);
        list.Formula.ExcelFormula = source;
        Stop(list, error);
    }

    private static void Stop(IExcelDataValidation validation, string error)
    {
        validation.ShowErrorMessage = true;
        validation.ErrorStyle = ExcelDataValidationWarningStyle.stop;
        validation.Error = error;
        validation.AllowBlank = true;
    }
}
