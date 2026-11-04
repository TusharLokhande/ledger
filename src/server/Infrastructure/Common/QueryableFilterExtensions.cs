using System.Linq.Expressions;
using Core.Common.Dashboard;

namespace Infrastructure.Common;

public static class QueryableFilterExtensions
{
    public static IQueryable<T> ApplyFilters<T>(
        this IQueryable<T> query,
        IEnumerable<PageFilter> filters,
        IDictionary<string, Expression<Func<T, string>>>? stringMap = null,
        IDictionary<string, LambdaExpression>? numberMap = null,
        IDictionary<string, LambdaExpression>? dateMap = null
        )
    {
        if (filters == null || !filters.Any())
            return query;

        foreach (var filter in filters)
        {
            switch (filter.Variant?.ToLower())
            {
                case "text":
                case "select":
                    if (stringMap is not null && stringMap.TryGetValue(filter.Field, out var stringSelector))
                    {
                        query = ApplyStringFilter(query, filter, stringSelector);
                    }
                    // A select over an enum column: numberMap already handles enum "eq".
                    else if (numberMap is not null && numberMap.TryGetValue(filter.Field, out var enumSelector))
                    {
                        query = ApplyNumberFilter(query, filter, enumSelector);
                    }
                    break;

                case "number":
                    if (numberMap is not null && numberMap.TryGetValue(filter.Field, out var numberSelector))
                    {
                        query = ApplyNumberFilter(query, filter, numberSelector);
                    }
                    break;

                case "date":
                    if (dateMap is not null && dateMap.TryGetValue(filter.Field, out var dateSelector))
                    {
                        query = ApplySingleDateFilter(query, filter, dateSelector);
                    }
                    break;

                case "daterange":
                    if (dateMap is not null && dateMap.TryGetValue(filter.Field, out var dateRangeSelector))
                    {
                        query = ApplyDateRangeFilter(query, filter, dateRangeSelector);
                    }
                    break;
            }
        }

        return query;
    }

    #region STRING FILTER

    private static IQueryable<T> ApplyStringFilter<T>(
        IQueryable<T> query,
        PageFilter filter,
        Expression<Func<T, string>> selector)
    {
        var value = filter.Values?.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(value))
            return query;

        return filter.Operator.ToLower() switch
        {
            "eq" => query.Where(BuildEqualsExpression(selector, value)),
            "ilike" => query.Where(BuildILike(selector, value)),
            _ => query
        };
    }

    private static Expression<Func<T, bool>> BuildILike<T>(
        Expression<Func<T, string>> selector,
        string value)
    {
        var parameter = selector.Parameters[0];
        var body = Expression.AndAlso(
            Expression.NotEqual(selector.Body, Expression.Constant(null)),
            Expression.Call(
                Expression.Call(selector.Body, nameof(string.ToLower), null),
                nameof(string.Contains),
                null,
                Expression.Constant(value.ToLower())
            )
        );

        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }

    private static Expression<Func<T, bool>> BuildEqualsExpression<T>(
        Expression<Func<T, string>> selector,
        string value)
    {
        var parameter = selector.Parameters[0];
        var left = selector.Body;
        var right = Expression.Constant(value, typeof(string));
        var body = Expression.Equal(left, right);

        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }
    #endregion

    #region NUMBER FILTER

    private static IQueryable<T> ApplyNumberFilter<T>(
        IQueryable<T> query,
        PageFilter filter,
        LambdaExpression selector
    )
    {
        var raw = filter.Values?.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return query;

        var parameter = selector.Parameters[0];
        var left = selector.Body;

        // handle nullable types
        var targetType = Nullable.GetUnderlyingType(left.Type) ?? left.Type;

        object? parsedValue;

        // ENUM SUPPORT
        if (targetType.IsEnum)
        {
            if (Enum.TryParse(targetType, raw, true, out var enumVal))
            {
                parsedValue = enumVal;
            }
            else if (int.TryParse(raw, out var intVal))
            {
                parsedValue = Enum.ToObject(targetType, intVal);
            }
            else
            {
                return query;
            }

            // restrict enum operators (only eq makes sense)
            if (!string.Equals(filter.Operator, "eq", StringComparison.OrdinalIgnoreCase))
                return query;
        }
        // NUMBER SUPPORT
        else
        {
            if (!decimal.TryParse(raw, out var parsed))
                return query;

            parsedValue = Convert.ChangeType(parsed, targetType);
        }

        var right = Expression.Constant(parsedValue, targetType);

        // if original property is nullable, convert
        if (left.Type != targetType)
            left = Expression.Convert(left, targetType);

        Expression? body = filter.Operator?.ToLower() switch
        {
            "eq" => Expression.Equal(left, right),
            "gt" => Expression.GreaterThan(left, right),
            "gte" => Expression.GreaterThanOrEqual(left, right),
            "lt" => Expression.LessThan(left, right),
            "lte" => Expression.LessThanOrEqual(left, right),
            _ => null
        };

        if (body == null)
            return query;

        var lambda = Expression.Lambda<Func<T, bool>>(body, parameter);
        return query.Where(lambda);
    }
    #endregion

    #region DATE FILTER

    private static object ConvertDateValue(DateTimeOffset value, Type targetType)
    {
        if (targetType == typeof(DateTime))
            return value.UtcDateTime;

        if (targetType == typeof(DateOnly))
            return DateOnly.FromDateTime(value.Date);

        return value;
    }

    private static IQueryable<T> ApplySingleDateFilter<T>(
        IQueryable<T> query,
        PageFilter filter,
        LambdaExpression selector
    )
    {
        if (filter.Values == null || !filter.Values.Any())
            return query;

        var parameter = selector.Parameters[0];
        var left = selector.Body;

        var targetType = Nullable.GetUnderlyingType(left.Type) ?? left.Type;

        if (!DateTimeOffset.TryParse(filter.Values.First(), out var parsed))
            return query;

        Expression constant = Expression.Constant(ConvertDateValue(parsed, targetType), targetType);

        if (Nullable.GetUnderlyingType(left.Type) != null)
            constant = Expression.Convert(constant, left.Type);

        Expression? body = filter.Operator.ToLower() switch
        {
            "eq" => Expression.Equal(left, constant),
            "gt" => Expression.GreaterThan(left, constant),
            "gte" => Expression.GreaterThanOrEqual(left, constant),
            "lt" => Expression.LessThan(left, constant),
            "lte" => Expression.LessThanOrEqual(left, constant),
            _ => null
        };

        if (body == null)
            return query;

        var lambda = Expression.Lambda<Func<T, bool>>(body, parameter);
        return query.Where(lambda);
    }

    #endregion

    #region DATE RANGE FILTER

    private static IQueryable<T> ApplyDateRangeFilter<T>(
        IQueryable<T> query,
        PageFilter filter,
        LambdaExpression selector
    )
    {
        if (filter.Values == null || filter.Values.Count != 2)
            return query;

        if (!DateTimeOffset.TryParse(filter.Values[0], out var start)
            || !DateTimeOffset.TryParse(filter.Values[1], out var end))
            return query;

        var parameter = selector.Parameters[0];
        var left = selector.Body;

        var targetType = Nullable.GetUnderlyingType(left.Type) ?? left.Type;

        Expression startConst = Expression.Constant(ConvertDateValue(start, targetType), targetType);
        Expression endConst = Expression.Constant(ConvertDateValue(end, targetType), targetType);

        if (Nullable.GetUnderlyingType(left.Type) != null)
        {
            startConst = Expression.Convert(startConst, left.Type);
            endConst = Expression.Convert(endConst, left.Type);
        }

        var body = Expression.AndAlso(
            Expression.GreaterThanOrEqual(left, startConst),
            Expression.LessThanOrEqual(left, endConst)
        );

        var lambda = Expression.Lambda<Func<T, bool>>(body, parameter);
        return query.Where(lambda);
    }

    #endregion
}
