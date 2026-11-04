namespace Core.Common;

/// <summary>Decimal places per ISO 4217 currency. .NET has no such table, so the exceptions are listed here.</summary>
public static class CurrencyDecimals
{
    private static readonly HashSet<string> Zero =
        ["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF"];
    private static readonly HashSet<string> Three = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"];
    private static readonly HashSet<string> Four = ["CLF", "UYW"];

    public static int For(string currencyCode)
    {
        if (Zero.Contains(currencyCode)) return 0;
        if (Three.Contains(currencyCode)) return 3;
        if (Four.Contains(currencyCode)) return 4;
        return 2;
    }
}
