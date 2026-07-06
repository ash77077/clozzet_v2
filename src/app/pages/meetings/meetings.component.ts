import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { MeetingsService } from '../../services/meetings.service';
import { Meeting, MeetingStatus, CreateMeetingDto } from '../../models/meeting.model';

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    TableModule, ButtonModule, DialogModule, InputTextModule,
    TextareaModule, TagModule, ToastModule, ConfirmDialogModule,
    SelectModule, DatePicker, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './meetings.component.html',
  styleUrl: './meetings.component.scss',
})
export class MeetingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  meetings: Meeting[] = [];
  filteredMeetings: Meeting[] = [];
  isLoading = false;
  searchTerm = '';

  showDialog = false;
  isEditMode = false;
  isSaving = false;
  editingId: string | null = null;
  meetingForm!: FormGroup;
  MeetingStatus = MeetingStatus;

  statusOptions = [
    { label: 'Scheduled', value: MeetingStatus.SCHEDULED },
    { label: 'Completed', value: MeetingStatus.COMPLETED },
    { label: 'Cancelled', value: MeetingStatus.CANCELLED },
    { label: 'No Show', value: MeetingStatus.NO_SHOW },
  ];

  statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Scheduled', value: MeetingStatus.SCHEDULED },
    { label: 'Completed', value: MeetingStatus.COMPLETED },
    { label: 'Cancelled', value: MeetingStatus.CANCELLED },
    { label: 'No Show', value: MeetingStatus.NO_SHOW },
  ];

  selectedStatusFilter = '';

  constructor(
    private fb: FormBuilder,
    private meetingsService: MeetingsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMeetings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.meetingForm = this.fb.group({
      title: ['', Validators.required],
      customerName: ['', Validators.required],
      contactPerson: [''],
      phone: [''],
      meetingDate: [null, Validators.required],
      duration: [30],
      address: [''],
      notes: [''],
      status: [MeetingStatus.SCHEDULED],
    });
  }

  loadMeetings(): void {
    this.isLoading = true;
    this.meetingsService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => { this.meetings = data; this.applyFilters(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilters(): void {
    let list = [...this.meetings];
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(t) ||
        m.customerName.toLowerCase().includes(t) ||
        (m.contactPerson || '').toLowerCase().includes(t)
      );
    }
    if (this.selectedStatusFilter) {
      list = list.filter(m => m.status === this.selectedStatusFilter);
    }
    // Sort: upcoming first by date ascending
    list.sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
    this.filteredMeetings = list;
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.meetingForm.reset({ status: MeetingStatus.SCHEDULED, duration: 30 });
    this.showDialog = true;
  }

  openEditDialog(meeting: Meeting): void {
    this.isEditMode = true;
    this.editingId = meeting._id!;
    this.meetingForm.patchValue({
      title: meeting.title,
      customerName: meeting.customerName,
      contactPerson: meeting.contactPerson || '',
      phone: meeting.phone || '',
      meetingDate: meeting.meetingDate ? new Date(meeting.meetingDate) : null,
      duration: meeting.duration || 30,
      address: meeting.address || '',
      notes: meeting.notes || '',
      status: meeting.status,
    });
    this.showDialog = true;
  }

  saveMeeting(): void {
    if (this.meetingForm.invalid) { this.meetingForm.markAllAsTouched(); return; }
    this.isSaving = true;
    const v = this.meetingForm.value;
    const dto: CreateMeetingDto = {
      title: v.title,
      customerName: v.customerName,
      contactPerson: v.contactPerson || undefined,
      phone: v.phone || undefined,
      address: v.address || undefined,
      meetingDate: v.meetingDate instanceof Date ? v.meetingDate.toISOString() : v.meetingDate,
      duration: v.duration || undefined,
      notes: v.notes || undefined,
      status: v.status,
    };

    const obs = this.isEditMode && this.editingId
      ? this.meetingsService.update(this.editingId, dto)
      : this.meetingsService.create(dto);

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        this.showDialog = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Meeting "${dto.title}" saved.` });
        this.loadMeetings();
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save meeting.' });
      }
    });
  }

  updateStatus(meeting: Meeting, status: MeetingStatus): void {
    this.meetingsService.update(meeting._id!, { status } as any).subscribe({
      next: () => {
        this.loadMeetings();
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Status updated.' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update.' })
    });
  }

  deleteMeeting(meeting: Meeting): void {
    this.confirmationService.confirm({
      message: `Delete meeting "${meeting.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.meetingsService.delete(meeting._id!).subscribe({
          next: () => {
            this.loadMeetings();
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Meeting deleted.' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete.' })
        });
      }
    });
  }

  getStatusSeverity(status: MeetingStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case MeetingStatus.SCHEDULED: return 'info';
      case MeetingStatus.COMPLETED: return 'success';
      case MeetingStatus.CANCELLED: return 'danger';
      case MeetingStatus.NO_SHOW: return 'warning';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: MeetingStatus): string {
    return this.statusOptions.find(s => s.value === status)?.label || status;
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }

  isUpcoming(m: Meeting): boolean {
    return m.status === MeetingStatus.SCHEDULED && new Date(m.meetingDate) >= new Date();
  }

  isOverdue(m: Meeting): boolean {
    return m.status === MeetingStatus.SCHEDULED && new Date(m.meetingDate) < new Date();
  }

  onNumberWheel(e: WheelEvent): void { (e.target as HTMLElement).blur(); }

  get scheduledCount(): number {
    return this.meetings.filter(m => m.status === MeetingStatus.SCHEDULED).length;
  }

  get completedCount(): number {
    return this.meetings.filter(m => m.status === MeetingStatus.COMPLETED).length;
  }
}
