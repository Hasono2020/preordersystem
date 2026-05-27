<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        // FIX 4: paginate() instead of get() so the list doesn't grow unbounded.
        $users = User::latest()->paginate(20);
        return Inertia::render('users/index', compact('users'));
    }

    public function create()
    {
        return Inertia::render('users/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role'     => 'required|in:admin,staff',
        ]);

        User::create([
            'name'              => $validated['name'],
            'email'             => $validated['email'],
            'password'          => Hash::make($validated['password']),
            'role'              => $validated['role'],
            'email_verified_at' => now(),
        ]);

        return redirect()->route('users.index')
            ->with('success', 'User created successfully.');
    }

    public function edit(User $user)
    {
        return Inertia::render('users/edit', compact('user'));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email,' . $user->id,
            'role'     => 'required|in:admin,staff',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $user->update([
            'name'  => $validated['name'],
            'email' => $validated['email'],
            'role'  => $validated['role'],
            ...($validated['password'] ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        return redirect()->route('users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        // Use request()->user() cast to our User model to satisfy Intelephense
        /** @var User $authUser */
        $authUser = request()->user();

        if ($authUser === null) {
            return back()->with('error', 'Unauthenticated.');
        }

        if ($user->id === $authUser->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        // FIX 1: Block deletion if this user has recorded orders.
        // The orders table cascades on user_id, so deleting the user
        // would silently wipe every order they ever created.
        if ($user->orders()->exists()) {
            return back()->with('error',
                "Cannot delete \"{$user->name}\" — they have recorded orders. " .
                "Reassign or delete their orders first."
            );
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User deleted.');
    }
}