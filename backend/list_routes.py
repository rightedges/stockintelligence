from main import app
for route in app.routes:
    methods = getattr(route, "methods", set())
    path = getattr(route, "path", "unknown")
    print(f"{list(methods)} {path}")
