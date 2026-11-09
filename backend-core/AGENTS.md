# Naming convention

In `backend-core/users`, each model has its own file. The filename is the model name plus the package role:

- `models/spend_tracker_model.py` — the Django model and constants that belong to it, including choices. A Django model manager such as `CustomerManager` stays here with the model.
- `serializers/spend_tracker_serializer.py` — serializers for that model.
- `views/spend_tracker_view.py` — API views for that model. Re-export them from `views/__init__.py`.
- `managers/spend_tracker_manager.py` — business logic for that model.


# Imports

Imports belong at the top of the file, not inside functions. Do not use star imports.
