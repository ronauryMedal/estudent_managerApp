import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type AuthShellVariant = 'login' | 'register';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.css',
})
export class AuthShellComponent {
  @Input({ required: true }) variant!: AuthShellVariant;
}
