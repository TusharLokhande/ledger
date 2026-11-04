using Domain.Entity;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Users> Users => Set<Users>();
    public DbSet<RefreshTokens> RefreshTokens => Set<RefreshTokens>();
    public DbSet<Accounts> Accounts => Set<Accounts>();
    public DbSet<Categories> Categories => Set<Categories>();
    public DbSet<ImportBatches> ImportBatches => Set<ImportBatches>();
    public DbSet<Budgets> Budgets => Set<Budgets>();
    public DbSet<Transactions> Transactions => Set<Transactions>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
