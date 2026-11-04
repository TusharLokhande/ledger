using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class BudgetsConfiguration : BaseConfiguration<Budgets>
{
    public override void Configure(EntityTypeBuilder<Budgets> builder)
    {
        base.Configure(builder);
        builder.ToTable("budgets");
        builder.Property(e => e.Amount).HasPrecision(18, 2);
        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
        builder.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
