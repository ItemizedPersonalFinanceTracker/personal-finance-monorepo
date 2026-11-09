from users.models import Category, Customer


def find_or_create_category(category_name: str, user: Customer):
    clean_name = category_name.strip().lower()
    category, _ = Category.objects.get_or_create(
        category_name=clean_name,
        customer=user,
    )
    return category
