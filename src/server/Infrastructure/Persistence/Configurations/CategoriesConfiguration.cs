using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class CategoriesConfiguration : BaseConfiguration<Categories>
{
    public override void Configure(EntityTypeBuilder<Categories> builder)
    {
        base.Configure(builder);
        builder.ToTable("categories");
        builder.Property(e => e.Name).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Icon).HasMaxLength(50).IsRequired();
        builder.Property(e => e.Color).HasMaxLength(7).IsRequired();
        builder.HasIndex(e => new { e.UserId, e.CategoryType, e.Name }).IsUnique();
        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
    }
}
