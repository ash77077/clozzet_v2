import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Tooltip } from 'primeng/tooltip';
import { AuthService, User } from '../../services/auth.service';
import { ProductDetailsService } from '../../services/product-details.service';
import { UsersService, User as ListUser } from '../../services/users.service';
import { OrderStatus, UserRole, ProductDetails } from '../../models/dashboard.models';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge.component';
import { NotificationService } from '../../services/notification.service';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface KanbanColumn {
  status: OrderStatus;
  label: string;
  icon: string;
  colorClass: string;
  orders: ProductDetails[];
}

export interface ActivityItem {
  type: 'comment' | 'status_change' | 'created' | 'file_upload';
  date: Date | string;
  author: string;
  content: string;
  avatarColor?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CLOTH_TYPES = [
  'T-Shirt', 'Polo', 'Hoodie', 'Sweatshirt', 'Cap', 'Jacket',
  'Tote Bag', 'Apron', 'Long Sleeve', 'Tank Top', 'Vest', 'Other'
];

const TEXTILE_TYPES = [
  'Cotton', 'Polyester', 'Cotton/Polyester Blend', 'Fleece',
  'Jersey', 'Pique', 'French Terry', 'Canvas', 'Nylon', 'Other'
];

const DESIGN_METHODS = [
  'Ասեղնագործություն',
  'DTF',
  'Մաղային'
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

@Component({
  selector: 'app-orders-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DragDropModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    AccordionModule,
    TextareaModule,
    PriorityBadgeComponent,
    Tooltip,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './orders-management.component.html',
  styleUrl: './orders-management.component.scss',
})
export class OrdersManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('commentTextarea') commentTextareaRef!: ElementRef;
  @ViewChild('activityFeed') activityFeedRef!: ElementRef;

  // ─── Data ──────────────────────────────────────────────────────────────────
  allOrders: ProductDetails[] = [];
  filteredOrders: ProductDetails[] = [];
  currentUser: User | null = null;
  selectedOrder: ProductDetails | null = null;

  // ─── UI state ──────────────────────────────────────────────────────────────
  isLoading = true;
  error = '';
  showOrderDetails = false;
  showStatusDialog = false;
  showAddOrderDialog = false;
  viewMode: 'kanban' | 'table' = 'kanban';
  isSaving = false;

  // ─── Add-order stepper ─────────────────────────────────────────────────────
  currentStep = 1;
  totalSteps = 4;
  addOrderForm!: FormGroup;

  // Size quantities (separate from reactive form for easy binding)
  sizeQuantities: { [size: string]: number } = {};
  sizes = SIZES;

  // ─── Status change ─────────────────────────────────────────────────────────
  orderToUpdate: ProductDetails | null = null;
  newStatus: OrderStatus = OrderStatus.PENDING;

  // ─── Search & filter ───────────────────────────────────────────────────────
  searchTerm = '';
  selectedStatusFilter = '';

  // ─── Jira Modal — Edit mode ─────────────────────────────────────────────────
  isEditMode = false;
  editOrderForm!: FormGroup;
  isEditSaving = false;

  // ─── Jira Modal — Inline status ────────────────────────────────────────────
  detailStatus: OrderStatus = OrderStatus.PENDING;

  // ─── Jira Modal — Activity feed ────────────────────────────────────────────
  orderActivity: ActivityItem[] = [];

  // ─── Jira Modal — Comments & @mention ─────────────────────────────────────
  commentText = '';
  isSubmittingComment = false;
  allUsers: ListUser[] = [];
  mentionSuggestions: ListUser[] = [];
  showMentionDropdown = false;
  mentionQuery = '';
  mentionStartPos = -1;
  mentionDropdownIndex = 0;

  // ─── Jira Modal — File uploads ─────────────────────────────────────────────
  pendingFiles: File[] = [];
  isUploadingFiles = false;

  // ─── Add Order Modal — File uploads ────────────────────────────────────────
  addOrderPendingFiles: File[] = [];

  // ─── Image preview modal ───────────────────────────────────────────────────
  showImagePreview = false;
  previewImageUrl = '';
  previewImageName = '';
  previewImagePath = ''; // Store full path for download

  // ─── Avatar palette ────────────────────────────────────────────────────────
  private avatarColors = ['#6366f1','#f59e0b','#10b981','#3b82f6','#a855f7','#ef4444','#ec4899','#14b8a6'];

  // ─── Constants ─────────────────────────────────────────────────────────────
  OrderStatus = OrderStatus;
  UserRole = UserRole;
  clothTypes = CLOTH_TYPES;
  textileTypes = TEXTILE_TYPES;
  designMethods = DESIGN_METHODS;

  availableStatuses = [
    { value: '', label: 'All Statuses' },
    { value: OrderStatus.PENDING, label: 'To-Do' },
    { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: OrderStatus.IN_PROGRESS, label: 'In Progress' },
    { value: OrderStatus.READY_FOR_DELIVERY, label: 'Ready for Delivery' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
    { value: OrderStatus.RETURNED, label: 'Returned' },
  ];

  statusOptions = [
    { value: OrderStatus.PENDING, label: 'To-Do' },
    { value: OrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: OrderStatus.IN_PROGRESS, label: 'In Progress' },
    { value: OrderStatus.READY_FOR_DELIVERY, label: 'Ready for Delivery' },
    { value: OrderStatus.DELIVERED, label: 'Delivered' },
    { value: OrderStatus.CANCELLED, label: 'Cancelled' },
    { value: OrderStatus.RETURNED, label: 'Returned' },
  ];

  priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  kanbanColumns: KanbanColumn[] = [
    { status: OrderStatus.PENDING, label: 'To-Do', icon: 'pi pi-circle', colorClass: 'col-todo', orders: [] },
    { status: OrderStatus.CONFIRMED, label: 'Confirmed', icon: 'pi pi-check-circle', colorClass: 'col-confirmed', orders: [] },
    { status: OrderStatus.IN_PROGRESS, label: 'In Progress', icon: 'pi pi-spinner', colorClass: 'col-inprogress', orders: [] },
    { status: OrderStatus.READY_FOR_DELIVERY, label: 'Ready', icon: 'pi pi-box', colorClass: 'col-ready', orders: [] },
    { status: OrderStatus.DELIVERED, label: 'Delivered', icon: 'pi pi-check-square', colorClass: 'col-delivered', orders: [] },
    { status: OrderStatus.CANCELLED, label: 'Cancelled', icon: 'pi pi-times-circle', colorClass: 'col-cancelled', orders: [] },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private productDetailsService: ProductDetailsService,
    private usersService: UsersService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUser = user;
    });
    this.loadOrders();
    this.initForm();
    this.loadUsers();
    this.setupRealtimeActivityListener();
    this.handleNavigationFromNotification();
  }

  // Handle navigation from notification
  handleNavigationFromNotification(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const orderId = params['order'];
      if (orderId) {
        console.log('📌 Navigating to order from notification:', orderId);

        // Wait for orders to load, then open the specific order
        // Use a retry mechanism to handle timing issues
        let attempts = 0;
        const maxAttempts = 5;

        const tryOpenOrder = () => {
          attempts++;
          console.log(`🔄 Attempt ${attempts} to open order:`, orderId);

          if (this.allOrders.length > 0) {
            // Orders are loaded, try to open
            this.openOrderById(orderId);
          } else if (attempts < maxAttempts) {
            // Orders not loaded yet, retry after delay
            console.log('⏳ Orders not loaded yet, retrying...');
            setTimeout(tryOpenOrder, 500);
          } else {
            // Max attempts reached, try to fetch the specific order
            console.log('⚠️ Orders still not loaded, fetching specific order');
            this.fetchAndOpenOrder(orderId);
          }
        };

        // Start with a small delay to allow initial load
        setTimeout(tryOpenOrder, 500);
      }
    });
  }

  // Open order by ID (from notification)
  openOrderById(orderId: string): void {
    console.log('🔍 Looking for order with ID:', orderId);
    console.log('📦 Total orders loaded:', this.allOrders.length);

    // Check if this order is already open
    if (this.selectedOrder) {
      const currentOrderId = (this.selectedOrder as any)._id || this.selectedOrder.id;
      if (currentOrderId === orderId) {
        console.log('ℹ️ Order is already open');
        return;
      }
    }

    const order = this.allOrders.find(o => {
      const id = (o as any)._id || o.id;
      return id === orderId;
    });

    if (order) {
      console.log('✅ Found order:', order.orderNumber);
      this.viewOrderDetails(order);
    } else {
      console.warn('⚠️ Order not found with ID:', orderId);
      console.log('Available order IDs:', this.allOrders.map(o => (o as any)._id || o.id));
      // Try to fetch the specific order if not in current list
      this.fetchAndOpenOrder(orderId);
    }
  }

  // Fetch and open a specific order by ID
  fetchAndOpenOrder(orderId: string): void {
    console.log('📥 Fetching order from API:', orderId);
    this.productDetailsService.getProductDetailsById(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            console.log('✅ Order fetched successfully:', response.data.orderNumber);
            this.viewOrderDetails(response.data);
          }
        },
        error: (error) => {
          console.error('❌ Failed to fetch order:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not find the order from notification.'
          });
        }
      });
  }

  // Setup real-time activity listener
  setupRealtimeActivityListener(): void {
    this.notificationService.onOrderActivity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Only update if we're viewing this order
          if (this.selectedOrder && ((this.selectedOrder as any)._id || this.selectedOrder.id) === data.orderId) {
            console.log('📬 Adding real-time activity to current order');
            // Add the activity to the bottom of the feed (new messages appear at bottom)
            this.orderActivity.push({
              type: data.activity.type,
              date: data.activity.date,
              author: data.activity.author,
              content: data.activity.content,
              avatarColor: this.getAvatarColor(data.activity.author),
            });

            // Auto-scroll to bottom to show new message
            setTimeout(() => this.scrollActivityToBottom(), 100);
          }
        },
        error: (err) => console.error('Error in activity listener:', err)
      });
  }

  // Scroll activity feed to bottom
  scrollActivityToBottom(): void {
    try {
      if (this.activityFeedRef && this.activityFeedRef.nativeElement) {
        const element = this.activityFeedRef.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Users for @mention ────────────────────────────────────────────────────

  loadUsers(): void {
    this.usersService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => { this.allUsers = users; },
      error: () => {} // fail silently
    });
  }

  // ─── Form init ─────────────────────────────────────────────────────────────

  initForm(): void {
    this.addOrderForm = this.fb.group({
      orderNumber:        ['', Validators.required],
      clientName:         ['', Validators.required],
      salesPerson:        ['', Validators.required],
      priority:           ['normal', Validators.required],
      status:             [OrderStatus.PENDING, Validators.required],
      clothType:          ['', Validators.required],
      textileType:        ['', Validators.required],
      designMethod:       ['', Validators.required],
      logoPosition:       [''],
      logoSize:           [''],
      customColorDetails: [''],
      startDate:          [''],
      deadline:           ['', Validators.required],
      specialInstructions:[''],
      shippingAddress:    [''],
    });
  }

  // ─── Add Order dialog ──────────────────────────────────────────────────────

  openAddOrderDialog(): void {
    this.currentStep = 1;
    this.sizeQuantities = {};
    this.sizes.forEach(s => this.sizeQuantities[s] = 0);

    const salesPersonName = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim()
      : '';

    this.addOrderForm.reset({ priority: 'normal', status: OrderStatus.PENDING });
    this.addOrderForm.patchValue({
      orderNumber: this.generateOrderNumber(),
      salesPerson: salesPersonName,
    });
    this.showAddOrderDialog = true;
  }

  closeAddOrderDialog(): void {
    this.showAddOrderDialog = false;
    this.addOrderForm.reset();
    this.sizeQuantities = {};
    this.addOrderPendingFiles = [];
  }

  generateOrderNumber(): string {
    const date = new Date();
    const d = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    return `ORD-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // ─── Stepper ───────────────────────────────────────────────────────────────

  nextStep(): void {
    if (this.isCurrentStepValid() && this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else if (!this.isCurrentStepValid()) {
      this.markCurrentStepTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields.' });
    }
  }

  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  goToStep(step: number): void { if (step < this.currentStep) this.currentStep = step; }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1: return this.step1Fields.every(f => this.addOrderForm.get(f)?.valid);
      case 2: return this.step2Fields.every(f => this.addOrderForm.get(f)?.valid);
      case 3: return this.step3Fields.every(f => this.addOrderForm.get(f)?.valid);
      case 4: return this.step4Fields.every(f => this.addOrderForm.get(f)?.valid);
      default: return true;
    }
  }

  private markCurrentStepTouched(): void {
    const fields = [this.step1Fields, this.step2Fields, this.step3Fields, this.step4Fields][this.currentStep - 1];
    fields.forEach(f => this.addOrderForm.get(f)?.markAsTouched());
  }

  private step1Fields = ['orderNumber','clientName','salesPerson','priority','status'];
  private step2Fields = ['clothType','textileType'];
  private step3Fields = ['designMethod'];
  private step4Fields = ['deadline'];

  isStepDone(step: number): boolean { return step < this.currentStep; }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.addOrderForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  get totalQuantity(): number {
    return Object.values(this.sizeQuantities).reduce((sum, v) => sum + (v || 0), 0);
  }

  // ─── Add Order File Upload ────────────────────────────────────────────────

  onAddOrderFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addOrderPendingFiles = [...this.addOrderPendingFiles, ...Array.from(input.files)];
      input.value = '';
    }
  }

  removeAddOrderFile(index: number): void {
    this.addOrderPendingFiles.splice(index, 1);
  }

  // ─── Submit order ──────────────────────────────────────────────────────────

  submitOrder(): void {
    if (!this.addOrderForm.get('deadline')?.valid) {
      this.addOrderForm.get('deadline')?.markAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Deadline is required.' });
      return;
    }

    this.isSaving = true;

    // If there are files, upload them first
    if (this.addOrderPendingFiles.length > 0) {
      this.productDetailsService.uploadFiles(this.addOrderPendingFiles).subscribe({
        next: (response) => {
          if (response?.success && response.data?.uploadedFiles) {
            const uploadedFileUrls = response.data.uploadedFiles.map((file: any) => file.url || file.path);
            this.createOrderWithFiles(uploadedFileUrls);
          } else {
            this.isSaving = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'File upload failed.' });
          }
        },
        error: () => {
          this.isSaving = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload files.' });
        },
      });
    } else {
      // No files, create order directly
      this.createOrderWithFiles([]);
    }
  }

  private createOrderWithFiles(fileUrls: string[]): void {
    const v = this.addOrderForm.value;
    const payload: any = {
      orderNumber: v.orderNumber, clientName: v.clientName, salesPerson: v.salesPerson,
      priority: v.priority, status: v.status, clothType: v.clothType, textileType: v.textileType,
      designMethod: v.designMethod, logoPosition: v.logoPosition || undefined,
      logoSize: v.logoSize || undefined, customColorDetails: v.customColorDetails || undefined,
      startDate: v.startDate || undefined, deadline: v.deadline,
      specialInstructions: v.specialInstructions || undefined,
      shippingAddress: v.shippingAddress || undefined,
      sizeQuantities: this.sizeQuantities, quantity: this.totalQuantity || 0,
      referenceImages: fileUrls.length > 0 ? fileUrls : undefined,
    };

    this.productDetailsService.submitProductDetails(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'success', summary: 'Order Created', detail: `Order ${payload.orderNumber} created successfully.` });
        this.closeAddOrderDialog();
        this.loadOrders();
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create order. Please try again.' });
      },
    });
  }

  // ─── Load & filter ─────────────────────────────────────────────────────────

  protected loadOrders(): void {
    this.isLoading = true;
    this.productDetailsService.getAllProductDetails().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.allOrders = response.data || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load orders';
        this.isLoading = false;
      },
    });
  }

  onSearchChange(): void { this.applyFilters(); }
  onStatusFilterChange(): void { this.applyFilters(); }

  applyFilters(): void {
    let filtered = [...this.allOrders];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.clientName.toLowerCase().includes(term) ||
        o.salesPerson.toLowerCase().includes(term)
      );
    }
    if (this.selectedStatusFilter) {
      filtered = filtered.filter(o => o.status === this.selectedStatusFilter);
    }
    this.filteredOrders = filtered;
    this.buildKanbanColumns(filtered);
  }

  buildKanbanColumns(orders: ProductDetails[]): void {
    this.kanbanColumns.forEach(col => {
      col.orders = orders.filter(o => o.status === col.status);
    });
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  get totalOrders(): number { return this.allOrders.length; }
  get pendingCount(): number { return this.allOrders.filter(o => o.status === OrderStatus.PENDING).length; }
  get inProgressCount(): number { return this.allOrders.filter(o => o.status === OrderStatus.IN_PROGRESS || o.status === OrderStatus.CONFIRMED).length; }
  get deliveredCount(): number { return this.allOrders.filter(o => o.status === OrderStatus.DELIVERED).length; }
  get urgentCount(): number { return this.allOrders.filter(o => (o as any).priority === 'urgent').length; }

  // ─── Order details (Jira modal) ────────────────────────────────────────────

  // Copy order link to clipboard
  copyOrderLink(): void {
    if (!this.selectedOrder) return;

    const orderId = (this.selectedOrder as any)._id || this.selectedOrder.id;
    const baseUrl = window.location.origin;
    const orderLink = `${baseUrl}/orders-management?order=${orderId}`;

    console.log('📋 Copying order link:', orderLink);

    navigator.clipboard.writeText(orderLink).then(() => {
      console.log('✅ Link copied to clipboard');
      this.messageService.add({
        severity: 'success',
        summary: 'Link Copied',
        detail: 'Order link copied to clipboard!',
        life: 3000
      });
    }).catch(err => {
      console.error('❌ Failed to copy link:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Failed to copy link to clipboard.'
      });
    });
  }

  viewOrderDetails(order: ProductDetails): void {
    this.selectedOrder = order;
    this.isEditMode = false;
    this.commentText = '';
    this.pendingFiles = [];
    this.showMentionDropdown = false;
    this.detailStatus = (order.status as OrderStatus) || OrderStatus.PENDING;
    this.loadOrderActivity(order);
    this.showOrderDetails = true;

    // Join the order room for real-time updates
    const orderId = (order as any)._id || order.id;
    if (orderId) {
      this.notificationService.joinOrderRoom(orderId);

      // Update URL with order query parameter (for sharing)
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { order: orderId },
        queryParamsHandling: 'merge'
      });
      console.log('🔗 Updated URL with order ID:', orderId);
    }
  }

  closeOrderDetails(): void {
    // Leave the order room
    if (this.selectedOrder) {
      const orderId = (this.selectedOrder as any)._id || this.selectedOrder.id;
      if (orderId) {
        this.notificationService.leaveOrderRoom(orderId);
      }
    }

    this.showOrderDetails = false;
    this.selectedOrder = null;
    this.isEditMode = false;
    this.orderActivity = [];
    this.pendingFiles = [];
    this.commentText = '';

    // Clear the order query parameter from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  loadOrderActivity(order: ProductDetails): void {
    const notes: any[] = (order as any).manufacturingNotes || [];
    this.orderActivity = [];

    // "Created" event
    this.orderActivity.push({
      type: 'created',
      date: (order as any).createdAt || new Date(),
      author: order.salesPerson || 'System',
      content: `Order <strong>${order.orderNumber}</strong> was created`,
      avatarColor: this.getAvatarColor(order.salesPerson || 'System'),
    });

    notes.forEach((note: any) => {
      const isStatus = note.content?.startsWith('STATUS:');
      const isFile   = note.content?.startsWith('Attached files:');
      this.orderActivity.push({
        type: isStatus ? 'status_change' : isFile ? 'file_upload' : 'comment',
        date: note.date,
        author: note.author,
        content: isStatus ? note.content.replace('STATUS:', '').trim() : note.content,
        avatarColor: this.getAvatarColor(note.author),
      });
    });

    this.orderActivity.sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );

    // Auto-scroll to bottom after loading
    setTimeout(() => this.scrollActivityToBottom(), 100);
  }

  loadOrderActivityForCurrent(): void {
    if (!this.selectedOrder) return;
    const id = (this.selectedOrder as any)._id || this.selectedOrder.id;
    if (!id) return;
    this.productDetailsService.getProductDetailsById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedOrder = res.data;
          this.loadOrderActivity(this.selectedOrder!);
          // Scroll will be triggered by loadOrderActivity
        }
      }
    });
  }

  // ─── Inline status change ──────────────────────────────────────────────────

  onDetailStatusChange(): void {
    if (!this.selectedOrder || this.detailStatus === this.selectedOrder.status) return;
    const id = (this.selectedOrder as any)._id || this.selectedOrder.id;
    if (!id) return;

    const oldLabel = this.getStatusLabel(this.selectedOrder.status || '');
    const newLabel = this.getStatusLabel(this.detailStatus);
    const author = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim() : 'System';

    this.productDetailsService.updateStatus(id, this.detailStatus).subscribe({
      next: () => {
        this.productDetailsService.addManufacturingNotes(id, `STATUS: ${oldLabel} → ${newLabel}`, author)
          .subscribe({ next: () => { this.loadOrders(); this.loadOrderActivityForCurrent(); } });
        if (this.selectedOrder) this.selectedOrder.status = this.detailStatus;
        this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${oldLabel} → ${newLabel}` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status' }),
    });
  }

  // ─── Edit mode ─────────────────────────────────────────────────────────────

  enableEditMode(): void {
    if (!this.selectedOrder) return;
    const o = this.selectedOrder as any;
    this.editOrderForm = this.fb.group({
      clientName:          [o.clientName || '', Validators.required],
      salesPerson:         [o.salesPerson || ''],
      priority:            [o.priority || 'normal'],
      status:              [o.status || OrderStatus.PENDING],
      startDate:           [o.startDate ? this.formatDateForInput(o.startDate) : ''],
      deadline:            [o.deadline ? this.formatDateForInput(o.deadline) : '', Validators.required],
      clothType:           [o.clothType || ''],
      textileType:         [o.textileType || ''],
      logoPosition:        [o.logoPosition || ''],
      logoSize:            [o.logoSize || ''],
      customColorDetails:  [o.customColorDetails || ''],
      specialInstructions: [o.specialInstructions || ''],
      shippingAddress:     [o.shippingAddress || ''],
    });
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
  }

  saveEdit(): void {
    if (!this.editOrderForm.valid || !this.selectedOrder) return;
    const id = (this.selectedOrder as any)._id || this.selectedOrder.id;
    if (!id) return;

    this.isEditSaving = true;
    const updates = this.editOrderForm.value;

    this.productDetailsService.updateProductDetails(id, updates).subscribe({
      next: () => {
        const author = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim() : 'System';
        this.productDetailsService.addManufacturingNotes(id, 'Order details were updated', author).subscribe();
        this.isEditSaving = false;
        this.isEditMode = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Order updated successfully.' });
        this.loadOrders();
        this.loadOrderActivityForCurrent();
      },
      error: () => {
        this.isEditSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save changes.' });
      },
    });
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  submitComment(): void {
    if (!this.commentText.trim() || !this.selectedOrder) return;
    const id = (this.selectedOrder as any)._id || this.selectedOrder.id;
    if (!id) return;

    const author = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim() : 'Anonymous';
    const commentText = this.commentText;
    this.isSubmittingComment = true;

    this.productDetailsService.addManufacturingNotes(id, commentText, author).subscribe({
      next: () => {
        this.isSubmittingComment = false;

        // Check for mentions and send notifications
        this.processMentions(commentText, id);

        this.commentText = '';
        this.loadOrderActivityForCurrent();
      },
      error: () => {
        this.isSubmittingComment = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add comment.' });
      },
    });
  }

  // Process @mentions and send notifications
  private processMentions(commentText: string, orderId: string): void {
    console.log('🔍 Processing mentions in comment:', commentText);

    if (!this.currentUser || !this.selectedOrder) {
      console.warn('⚠️ Cannot process mentions: missing currentUser or selectedOrder');
      return;
    }

    // Find all @mentions in the comment
    const mentionRegex = /@([\w]+\s+[\w]+|[\w]+)/g;
    const mentions = commentText.match(mentionRegex);

    console.log('📝 Found mentions:', mentions);

    if (!mentions || mentions.length === 0) {
      console.log('ℹ️ No mentions found in comment');
      return;
    }

    const fromUserName = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
    const fromUserId = this.currentUser.id || '';
    const orderNumber = this.selectedOrder.orderNumber;

    console.log('👤 From user:', fromUserName, 'ID:', fromUserId);
    console.log('📦 Order:', orderNumber);
    console.log('👥 Available users:', this.allUsers.length);

    // Process each mention
    mentions.forEach(mention => {
      const userName = mention.substring(1).trim(); // Remove @ symbol
      console.log('🔎 Looking for user:', userName);

      // Find the mentioned user in the users list
      const mentionedUser = this.allUsers.find(u => {
        const fullName = `${u.firstName} ${u.lastName}`.trim();
        return fullName.toLowerCase() === userName.toLowerCase();
      });

      if (!mentionedUser) {
        console.warn(`⚠️ User not found: ${userName}`);
        console.log('Available user names:', this.allUsers.map(u => `${u.firstName} ${u.lastName}`));
        return;
      }

      if (!mentionedUser._id) {
        console.warn(`⚠️ User ${userName} has no _id`);
        return;
      }

      if (mentionedUser._id === fromUserId) {
        console.log(`ℹ️ Skipping self-mention for ${userName}`);
        return;
      }

      console.log(`📤 Sending notification to ${mentionedUser.firstName} ${mentionedUser.lastName} (${mentionedUser._id})`);

      // Send notification to the mentioned user
      this.notificationService.createMentionNotification(
        mentionedUser._id,
        fromUserName,
        fromUserId,
        orderNumber,
        orderId,
        commentText
      ).subscribe({
        next: (response) => {
          console.log(`✅ Notification sent successfully to ${mentionedUser.firstName} ${mentionedUser.lastName}`, response);
        },
        error: (err) => {
          console.error(`❌ Failed to send mention notification to ${mentionedUser.firstName} ${mentionedUser.lastName}:`, err);
        }
      });
    });
  }

  // ─── @mention ──────────────────────────────────────────────────────────────

  onCommentInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursor = textarea.selectionStart;
    const before = value.substring(0, cursor);
    const atIdx = before.lastIndexOf('@');

    if (atIdx >= 0 && (atIdx === 0 || /\s/.test(value[atIdx - 1]))) {
      const query = before.substring(atIdx + 1);
      if (!query.includes(' ') || query.length < 20) {
        this.mentionQuery = query;
        this.mentionStartPos = atIdx;
        this.mentionSuggestions = this.allUsers
          .filter(u =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6);
        this.showMentionDropdown = this.mentionSuggestions.length > 0;
        this.mentionDropdownIndex = 0;
        return;
      }
    }
    this.showMentionDropdown = false;
  }

  onCommentKeydown(event: KeyboardEvent): void {
    if (!this.showMentionDropdown) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.mentionDropdownIndex = Math.min(this.mentionDropdownIndex + 1, this.mentionSuggestions.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.mentionDropdownIndex = Math.max(this.mentionDropdownIndex - 1, 0);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (this.mentionSuggestions[this.mentionDropdownIndex]) {
        this.selectMention(this.mentionSuggestions[this.mentionDropdownIndex]);
      }
    } else if (event.key === 'Escape') {
      this.showMentionDropdown = false;
    }
  }

  selectMention(user: ListUser): void {
    const mention = `@${user.firstName} ${user.lastName}`;
    const before = this.commentText.substring(0, this.mentionStartPos);
    const after = this.commentText.substring(this.mentionStartPos + 1 + this.mentionQuery.length);
    this.commentText = `${before}${mention} ${after}`;
    this.showMentionDropdown = false;
    this.mentionSuggestions = [];
    setTimeout(() => this.commentTextareaRef?.nativeElement?.focus(), 0);
  }

  renderMentions(content: string): string {
    if (!content) return '';
    return content.replace(/@([\w]+ [\w]+|[\w]+)/g, m => `<span class="mention-tag">${m}</span>`);
  }

  // ─── File upload ───────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.pendingFiles = [...this.pendingFiles, ...Array.from(input.files)];
      input.value = '';
    }
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  uploadPendingFiles(): void {
    if (!this.pendingFiles.length || !this.selectedOrder) return;
    const id = (this.selectedOrder as any)._id || this.selectedOrder.id;
    this.isUploadingFiles = true;

    this.productDetailsService.uploadFiles(this.pendingFiles).subscribe({
      next: (response) => {
        if (response?.success && response.data?.uploadedFiles) {
          // Extract Cloudinary URLs from upload response
          const uploadedFileUrls = response.data.uploadedFiles.map((file: any) => file.url || file.path);

          // Get existing reference images or initialize empty array
          const existingReferenceImages = this.selectedOrder?.referenceImages || [];
          const updatedReferenceImages = [...existingReferenceImages, ...uploadedFileUrls];

          // Update the order record with the new Cloudinary URLs
          this.productDetailsService.updateProductDetails(id, {
            referenceImages: updatedReferenceImages
          }).subscribe({
            next: () => {
              const author = this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim() : 'System';
              const names = this.pendingFiles.map(f => f.name).join(', ');

              // Add manufacturing note
              this.productDetailsService.addManufacturingNotes(id, `Attached files: ${names}`, author)
                .subscribe({
                  next: () => {
                    this.isUploadingFiles = false;
                    this.pendingFiles = [];
                    this.messageService.add({ severity: 'success', summary: 'Files Uploaded', detail: 'Files uploaded to cloud successfully.' });
                    // Reload the order to show the updated files
                    this.loadOrderActivityForCurrent();
                    this.loadOrders(); // Refresh the orders list
                  }
                });
            },
            error: () => {
              this.isUploadingFiles = false;
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save file references to order.' });
            }
          });
        } else {
          this.isUploadingFiles = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Upload succeeded but no file data returned.' });
        }
      },
      error: () => {
        this.isUploadingFiles = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload files.' });
      },
    });
  }

  // ─── Status change (separate dialog) ──────────────────────────────────────

  openStatusDialog(order: ProductDetails): void {
    this.orderToUpdate = order;
    this.newStatus = (order.status as OrderStatus) || OrderStatus.PENDING;
    this.showStatusDialog = true;
  }

  confirmStatusUpdate(): void {
    if (!this.orderToUpdate) return;
    const id = (this.orderToUpdate as any)._id || this.orderToUpdate.id;
    if (!id) { this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Order ID not found' }); return; }

    this.productDetailsService.updateStatus(id, this.newStatus).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `Order ${this.orderToUpdate!.orderNumber} → "${this.getStatusLabel(this.newStatus)}"` });
        this.showStatusDialog = false;
        this.orderToUpdate = null;
        this.loadOrders();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status' }),
    });
  }

  quickStatusChange(order: ProductDetails, status: OrderStatus): void {
    const id = (order as any)._id || order.id;
    if (!id) return;
    this.productDetailsService.updateStatus(id, status).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${order.orderNumber} → ${this.getStatusLabel(status)}` });
        this.loadOrders();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status' }),
    });
  }

  deleteOrder(order: ProductDetails): void {
    this.confirmationService.confirm({
      message: `Delete order ${order.orderNumber}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text',
      defaultFocus: 'reject',
      accept: () => {
        const id = (order as any)._id || order.id;
        this.productDetailsService.deleteProductDetails(id).subscribe({
          next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `Order ${order.orderNumber} deleted` }); this.loadOrders(); },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete order' }),
        });
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || this.currentUser?.role === UserRole.MANAGER;
  }

  getStatusLabel(status: OrderStatus | string): string {
    return this.availableStatuses.find(s => s.value === status)?.label || status;
  }

  getStatusSeverity(status: OrderStatus | string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | null | undefined {
    switch (status) {
      case OrderStatus.DELIVERED: return 'success';
      case OrderStatus.IN_PROGRESS: case OrderStatus.CONFIRMED: return 'info';
      case OrderStatus.PENDING: case OrderStatus.READY_FOR_DELIVERY: return 'warning';
      case OrderStatus.CANCELLED: case OrderStatus.RETURNED: return 'danger';
      default: return 'secondary';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateForInput(date: Date | string): string {
    if (!date) return '';
    try { return new Date(date as string).toISOString().split('T')[0]; } catch { return ''; }
  }

  formatActivityDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date as string);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isDeadlineUrgent(deadline: string): boolean {
    if (!deadline) return false;
    return new Date(deadline) <= new Date(Date.now() + 3 * 86400000);
  }

  getObjectKeys(obj: any): string[] { return Object.keys(obj || {}); }

  getInitials(name: string): string {
    if (!name || !name.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    if (!name) return this.avatarColors[0];
    let h = 0;
    for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
    return this.avatarColors[h % this.avatarColors.length];
  }

  getFileName(path: string): string {
    if (!path) return '';
    return path.split(/[/\\]/).pop() || path;
  }

  getFileUrl(filename: string): string {
    if (!filename) return '';

    // If it's already a full URL (Cloudinary), return as is
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }

    // For backward compatibility: old local filenames
    // Use preview endpoint for inline display
    const apiUrl = 'http://localhost:3000';
    return `${apiUrl}/product-details/preview/${filename}`;
  }

  isImageFile(filename: string): boolean {
    if (!filename) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowerFilename.endsWith(ext));
  }

  openImagePreview(filename: string): void {
    this.previewImageUrl = this.getFileUrl(filename);
    this.previewImageName = this.getFileName(filename);
    this.previewImagePath = filename; // Store full path for download
    this.showImagePreview = true;
  }

  closeImagePreview(): void {
    this.showImagePreview = false;
    this.previewImageUrl = '';
    this.previewImageName = '';
    this.previewImagePath = '';
  }

  downloadFile(filename: string): void {
    if (!filename) return;

    // If it's a Cloudinary URL, open it directly
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      window.open(filename, '_blank');
      return;
    }

    // For backward compatibility: old local filenames
    const apiUrl = 'http://localhost:3000';
    const downloadUrl = `${apiUrl}/product-details/files/${filename}`;
    window.open(downloadUrl, '_blank');
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.style.display = 'flex';
      parent.style.alignItems = 'center';
      parent.style.justifyContent = 'center';
      parent.innerHTML = '<i class="pi pi-image" style="font-size: 2.5rem; color: var(--red-400);"></i>';
    }
  }

  hasFiles(): boolean {
    if (!this.selectedOrder) return false;

    // Check all possible file arrays
    const hasLogo = !!(this.selectedOrder.logoFiles && Array.isArray(this.selectedOrder.logoFiles) && this.selectedOrder.logoFiles.length > 0);
    const hasDesign = !!(this.selectedOrder.designFiles && Array.isArray(this.selectedOrder.designFiles) && this.selectedOrder.designFiles.length > 0);
    const hasReference = !!(this.selectedOrder.referenceImages && Array.isArray(this.selectedOrder.referenceImages) && this.selectedOrder.referenceImages.length > 0);

    return hasLogo || hasDesign || hasReference;
  }

  hasGarmentSpecs(): boolean {
    if (!this.selectedOrder) return false;
    const specs = ['neckStyle','sleeveType','fit','hoodieStyle','pocketType','zipperType'] as (keyof ProductDetails)[];
    return specs.some(s => this.selectedOrder?.[s]);
  }

  getNextStatus(current: OrderStatus): OrderStatus | null {
    const flow = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS, OrderStatus.READY_FOR_DELIVERY, OrderStatus.DELIVERED];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  }

  // ─── Drag and Drop Handler ─────────────────────────────────────────────────
  getConnectedLists(currentIndex: number): string[] {
    // Return IDs of all other drop lists to enable cross-column dragging
    return this.kanbanColumns
      .map((_, index) => `kanban-list-${index}`)
      .filter((_, index) => index !== currentIndex);
  }

  onCardDrop(event: CdkDragDrop<ProductDetails[]>, targetStatus: OrderStatus): void {
    if (event.previousContainer === event.container) {
      // Reordering within the same column
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Moving to a different column
      const order = event.previousContainer.data[event.previousIndex];

      // Transfer the item between arrays
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update the order status in the backend
      if (order && order._id) {
        this.productDetailsService.updateStatus(order._id, targetStatus).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Status Updated',
              detail: `Order ${order.orderNumber} moved to ${this.getStatusLabel(targetStatus)}`,
              life: 3000
            });
            // Refresh the order to get updated data
            this.loadOrders();
          },
          error: (error: any) => {
            console.error('Error updating status:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: 'Failed to update order status',
              life: 3000
            });
            // Revert the move on error
            transferArrayItem(
              event.container.data,
              event.previousContainer.data,
              event.currentIndex,
              event.previousIndex
            );
          }
        });
      }
    }
  }

  f(name: string): AbstractControl { return this.addOrderForm.get(name)!; }
}
