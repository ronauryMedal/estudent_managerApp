import { Component, OnInit, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { StudentTaskNotificationsService } from './core/services/student-task-notifications.service';
import { StudentTasksService } from './core/services/student-tasks.service';
import { dedupeById } from './core/utils/dedupe-by-id';
import { openTasks } from './core/utils/dedupe-tasks';
import { StudentSideMenuComponent } from './shared/student-side-menu/student-side-menu.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, StudentSideMenuComponent],
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tasksApi = inject(StudentTasksService);
  private readonly taskNotifications = inject(StudentTaskNotificationsService);

  ngOnInit(): void {
    void this.syncTaskRemindersOnLaunch();
  }

  private async syncTaskRemindersOnLaunch(): Promise<void> {
    if (!this.auth.isAuthenticated() || !this.taskNotifications.isSupported()) {
      return;
    }

    await this.taskNotifications.initialize();
    try {
      const list = await firstValueFrom(this.tasksApi.list());
      await this.taskNotifications.syncTasks(openTasks(dedupeById(list)));
    } catch {
      /* Sin conexión al abrir */
    }
  }
}
