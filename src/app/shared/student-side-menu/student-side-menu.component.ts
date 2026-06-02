import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonAvatar,
  IonContent,
  IonIcon,
  IonMenu,
  MenuController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  clipboardOutline,
  homeOutline,
  libraryOutline,
  logOutOutline,
  peopleOutline,
  personCircleOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/services/auth.service';
import { userInitials } from '../../core/utils/user-initials';

const MENU_ID = 'student-menu';

@Component({
  selector: 'app-student-side-menu',
  standalone: true,
  imports: [IonMenu, IonContent, IonIcon, IonAvatar],
  templateUrl: './student-side-menu.component.html',
  styleUrl: './student-side-menu.component.scss',
})
export class StudentSideMenuComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuCtrl = inject(MenuController);

  readonly initials = () =>
    userInitials(this.auth.currentUser()?.name);

  constructor() {
    addIcons({
      chevronForwardOutline,
      homeOutline,
      clipboardOutline,
      libraryOutline,
      peopleOutline,
      logOutOutline,
      personCircleOutline,
    });
  }

  isProfileRoute(): boolean {
    return this.router.url.includes('/profile');
  }

  isHomeRoute(): boolean {
    const url = this.router.url;
    return url.includes('/tabs/tab1') || url === '/tabs' || url === '/';
  }

  isTasksRoute(): boolean {
    return this.router.url.includes('/tabs/tab2');
  }

  isSubjectsRoute(): boolean {
    return this.router.url.includes('/tabs/tab3');
  }

  isTeachersRoute(): boolean {
    return this.router.url.includes('/teachers');
  }

  async go(path: string): Promise<void> {
    await this.menuCtrl.close(MENU_ID);
    const target = path.startsWith('/') ? path : `/${path}`;
    if (this.router.url === target || this.router.url.startsWith(`${target}?`)) {
      return;
    }
    await this.router.navigateByUrl(target);
  }

  async logout(): Promise<void> {
    await this.menuCtrl.close(MENU_ID);
    this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
