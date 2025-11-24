<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $search = trim((string) $request->input('search', ''));

        $query = User::query()->with(['roles:name', 'shops:id,name']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query
            ->latest('id')
            ->paginate((int) $request->integer('per_page', 10))
            ->withQueryString();

        $roles = ['Super admin', 'admin', 'vendeur'];

        return Inertia::render('users/index', [
            'users' => UserResource::collection($users),
            'filters' => [
                'search' => $search !== '' ? $search : null,
            ],
            'meta' => [
                'roles' => $roles,
                'shops' => Shop::query()->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        // Create user (password cast handles hashing)
        $user = new User;
        $user->name = $data['name'];
        // Normalize optional username
        $username = $data['username'] ?? null;
        if ($username === '') {
            $username = null;
        }
        $user->username = $username;
        $user->email = $data['email'];
        $user->password = $data['password'];
        $user->save();

        // Assign role
        $roleName = $data['role'];
        $role = Role::findOrCreate($roleName);
        $user->syncRoles([$role]);

        // Assign shops depending on role
        $this->syncUserShopsByRole($user, $roleName, $data);

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur créé avec succès.');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }
        if (array_key_exists('username', $data)) {
            $username = $data['username'];
            if ($username === '') {
                $username = null;
            }
            $user->username = $username;
        }
        if (! empty($data['password'] ?? null)) {
            $user->password = $data['password'];
        }
        $user->save();

        if (array_key_exists('role', $data)) {
            $roleName = $data['role'];
            $role = Role::findOrCreate($roleName);
            $user->syncRoles([$role]);
        }

        $effectiveRole = $data['role'] ?? $user->getRoleNames()->first();
        $this->syncUserShopsByRole($user, $effectiveRole, $data);

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur mis à jour.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();

        // Prevent deleting self
        abort_if($actor && $actor->id === $user->id, 403);

        // Only admin or superadmin may delete, and admin cannot delete superadmin
        $actorIsSuper = $actor?->hasRole('Super admin') ?? false;
        $actorIsAdmin = $actor?->hasRole('admin') ?? false;
        $targetIsSuper = $user->hasRole('Super admin');

        abort_unless(($actorIsSuper || $actorIsAdmin) && ! ($actorIsAdmin && $targetIsSuper), 403);

        $user->delete();

        return redirect()->route('admin.users.index')
            ->with('success', 'Utilisateur supprimé.');
    }

    /**
     * @param  array<string,mixed>  $data
     */
    protected function syncUserShopsByRole(User $user, string $roleName, array $data): void
    {
        if ($roleName === 'Super admin') {
            // Super admin: no assignment restriction needed; keep empty relation
            $user->shops()->sync([]);

            return;
        }

        if ($roleName === 'admin') {
            $ids = collect($data['shop_ids'] ?? [])->filter()->map(fn ($id) => (int) $id)->values()->all();
            $user->shops()->sync($ids);

            return;
        }

        if ($roleName === 'vendeur') {
            $id = $data['shop_id'] ?? null;
            $user->shops()->sync($id ? [(int) $id] : []);

            return;
        }

        // Default safety
        $user->shops()->sync([]);
    }
}
