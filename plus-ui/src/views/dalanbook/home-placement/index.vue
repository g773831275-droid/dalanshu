<template>
  <div class="p-2">
    <el-card shadow="never">
      <el-tabs v-model="activeType" @tab-change="handleTabChange">
        <el-tab-pane label="广告弹窗" name="popup_ad" />
        <el-tab-pane label="置顶公告" name="pinned_notice" />
      </el-tabs>

      <el-form ref="queryFormRef" :model="queryParams" :inline="true" class="mb-3">
        <el-form-item label="关键词" prop="keyword">
          <el-input v-model="queryParams.keyword" placeholder="搜索标题或摘要" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="发布状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable class="w-36">
            <el-option label="已发布" value="published" />
            <el-option label="已隐藏" value="hidden" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="mb-3 flex items-center justify-between gap-3">
        <el-button v-hasPermi="['dalanbook:home-placement:add']" type="primary" plain icon="Plus" @click="handleAdd"> 新增{{ typeLabel }} </el-button>
        <span class="text-sm text-gray-500">同类型按优先级和发布时间选择一条生效内容</span>
      </div>

      <el-table v-loading="loading" :data="placementList" border>
        <el-table-column label="标题" prop="title" min-width="220" show-overflow-tooltip />
        <el-table-column v-if="activeType === 'popup_ad'" label="图片" width="88" align="center">
          <template #default="scope">
            <el-image
              v-if="scope.row.imageUrl"
              :src="scope.row.imageUrl"
              fit="cover"
              class="placement-thumb"
              :preview-src-list="[scope.row.imageUrl]"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="scope">
            <el-tag :type="deliveryState(scope.row).type">{{ deliveryState(scope.row).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" prop="priority" width="90" align="center" />
        <el-table-column v-if="activeType === 'popup_ad'" label="版本" prop="version" width="80" align="center" />
        <el-table-column label="投放时段" min-width="280">
          <template #default="scope">
            <span>{{ scheduleText(scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updatedAt" width="170">
          <template #default="scope">{{ proxy?.parseTime(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="scope">
            <el-tooltip content="编辑" placement="top">
              <el-button v-hasPermi="['dalanbook:home-placement:edit']" link type="primary" icon="Edit" @click="handleEdit(scope.row)" />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button v-hasPermi="['dalanbook:home-placement:remove']" link type="danger" icon="Delete" @click="handleDelete(scope.row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="760px" append-to-body destroy-on-close>
      <el-form ref="placementFormRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="120" show-word-limit :placeholder="`请输入${typeLabel}标题`" />
        </el-form-item>

        <el-form-item v-if="form.placementType === 'popup_ad'" label="广告图片" prop="imageOssId">
          <ImageUpload v-model="form.imageOssId" :limit="1" :file-size="5" :file-type="['jpg', 'jpeg', 'png', 'webp']" />
        </el-form-item>

        <el-form-item :label="form.placementType === 'popup_ad' ? '活动简介' : '横幅摘要'" prop="summary">
          <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="请输入简短摘要" />
        </el-form-item>

        <el-form-item v-if="form.placementType === 'pinned_notice'" label="公告正文" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="20000" show-word-limit placeholder="请输入纯文本公告正文" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="9">
            <el-form-item label="按钮文案" prop="ctaText">
              <el-input v-model="form.ctaText" maxlength="40" placeholder="可不填" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="15">
            <el-form-item label="目标链接" prop="targetUrl">
              <el-input v-model="form.targetUrl" maxlength="500" placeholder="/站内路径 或 https://地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="8">
            <el-form-item label="优先级" prop="priority">
              <el-input-number v-model="form.priority" :min="-100000" :max="100000" controls-position="right" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="16">
            <el-form-item label="发布状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="published">发布</el-radio>
                <el-radio value="hidden">隐藏</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item label="开始时间" prop="startsAt">
              <el-date-picker
                v-model="form.startsAt"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                placeholder="不填表示立即开始"
                class="w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="结束时间" prop="endsAt">
              <el-date-picker
                v-model="form.endsAt"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                placeholder="不填表示长期有效"
                class="w-full"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="HomePlacement" lang="ts">
import { addHomePlacement, deleteHomePlacement, getHomePlacement, listHomePlacements, updateHomePlacement } from '@/api/dalanbook/homePlacement';
import { HomePlacementForm, HomePlacementPayload, HomePlacementQuery, HomePlacementType, HomePlacementVO } from '@/api/dalanbook/homePlacement/types';

const { proxy } = getCurrentInstance() as ComponentInternalInstance;
const activeType = ref<HomePlacementType>('popup_ad');
const loading = ref(false);
const submitting = ref(false);
const total = ref(0);
const placementList = ref<HomePlacementVO[]>([]);
const queryFormRef = ref<ElFormInstance>();
const placementFormRef = ref<ElFormInstance>();

const typeLabel = computed(() => (activeType.value === 'popup_ad' ? '广告' : '公告'));
const dialog = reactive<DialogOption>({ visible: false, title: '' });

const initForm = (type: HomePlacementType): HomePlacementForm => ({
  placementType: type,
  title: '',
  summary: '',
  content: '',
  imageOssId: '',
  ctaText: '',
  targetUrl: '',
  priority: 0,
  status: 'hidden',
  startsAt: null,
  endsAt: null
});

const queryParams = reactive<HomePlacementQuery>({
  pageNum: 1,
  pageSize: 10,
  placementType: activeType.value,
  status: '',
  keyword: ''
});
const form = ref<HomePlacementForm>(initForm(activeType.value));

const pairedLinkValidator = (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
  const hasText = form.value.ctaText.trim().length > 0;
  const hasTarget = form.value.targetUrl.trim().length > 0;
  if (hasText !== hasTarget) callback(new Error('按钮文案与目标链接必须同时填写'));
  else callback();
};

const targetValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  pairedLinkValidator(_rule, value, (pairError?: Error) => {
    if (pairError) return callback(pairError);
    const target = value.trim();
    if (!target) return callback();
    if (/^\/(?!\/)/.test(target)) return callback();
    try {
      const url = new URL(target);
      if (url.protocol === 'https:' && url.username === '' && url.password === '') return callback();
    } catch {
      // 统一在下方返回格式错误。
    }
    callback(new Error('仅支持以单个 / 开头的站内路径或 HTTPS 地址'));
  });
};

const imageValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (form.value.placementType === 'popup_ad' && !value) callback(new Error('请上传广告图片'));
  else callback();
};

const contentValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (form.value.placementType === 'pinned_notice' && !value.trim()) callback(new Error('请输入公告正文'));
  else callback();
};

const endTimeValidator = (_rule: unknown, value: string | null, callback: (error?: Error) => void) => {
  if (form.value.startsAt && value && new Date(value).getTime() <= new Date(form.value.startsAt).getTime()) {
    callback(new Error('结束时间必须晚于开始时间'));
  } else callback();
};

const rules: ElFormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  imageOssId: [{ validator: imageValidator, trigger: 'change' }],
  content: [{ validator: contentValidator, trigger: 'blur' }],
  ctaText: [{ validator: pairedLinkValidator, trigger: 'blur' }],
  targetUrl: [{ validator: targetValidator, trigger: 'blur' }],
  endsAt: [{ validator: endTimeValidator, trigger: 'change' }]
};

const getList = async () => {
  loading.value = true;
  queryParams.placementType = activeType.value;
  try {
    const res = await listHomePlacements(queryParams);
    placementList.value = res.rows;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  queryParams.pageNum = 1;
  getList();
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryFormRef.value?.resetFields();
  handleQuery();
};

const resetForm = (type = activeType.value) => {
  form.value = initForm(type);
  nextTick(() => placementFormRef.value?.clearValidate());
};

const handleAdd = () => {
  resetForm();
  dialog.title = `新增${typeLabel.value}`;
  dialog.visible = true;
};

const handleEdit = async (row: HomePlacementVO) => {
  resetForm(row.placementType);
  const { data } = await getHomePlacement(row.id);
  form.value = {
    id: data.id,
    placementType: data.placementType,
    title: data.title,
    summary: data.summary ?? '',
    content: data.content ?? '',
    imageOssId: data.imageOssId == null ? '' : String(data.imageOssId),
    ctaText: data.ctaText ?? '',
    targetUrl: data.targetUrl ?? '',
    priority: data.priority,
    status: data.status,
    startsAt: data.startsAt,
    endsAt: data.endsAt
  };
  dialog.title = `编辑${typeLabel.value}`;
  dialog.visible = true;
};

const payload = (): HomePlacementPayload => ({
  placementType: form.value.placementType,
  title: form.value.title.trim(),
  summary: form.value.summary.trim() || null,
  content: form.value.content.trim() || null,
  imageOssId: form.value.imageOssId ? Number(form.value.imageOssId) : null,
  ctaText: form.value.ctaText.trim() || null,
  targetUrl: form.value.targetUrl.trim() || null,
  priority: form.value.priority,
  status: form.value.status,
  startsAt: form.value.startsAt,
  endsAt: form.value.endsAt
});

const submitForm = () => {
  placementFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (form.value.id) await updateHomePlacement(form.value.id, payload());
      else await addHomePlacement(payload());
      proxy?.$modal.msgSuccess('保存成功');
      dialog.visible = false;
      await getList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: HomePlacementVO) => {
  await proxy?.$modal.confirm(`确认删除“${row.title}”吗？删除后不可恢复。`);
  await deleteHomePlacement(row.id);
  proxy?.$modal.msgSuccess('删除成功');
  await getList();
};

const deliveryState = (row: HomePlacementVO): { label: string; type: 'success' | 'warning' | 'info' | 'danger' } => {
  if (row.status === 'hidden') return { label: '已隐藏', type: 'info' };
  const now = Date.now();
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return { label: '待生效', type: 'warning' };
  if (row.endsAt && new Date(row.endsAt).getTime() <= now) return { label: '已结束', type: 'danger' };
  return { label: '生效中', type: 'success' };
};

const scheduleText = (row: HomePlacementVO) => {
  const start = row.startsAt ? proxy?.parseTime(row.startsAt) : '立即';
  const end = row.endsAt ? proxy?.parseTime(row.endsAt) : '长期';
  return `${start} 至 ${end}`;
};

onMounted(getList);
</script>

<style scoped>
.placement-thumb {
  width: 54px;
  height: 40px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: calc(100% - 24px) !important;
  }
}
</style>
