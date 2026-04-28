import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, Plus, Edit2, Trash2, Check, X, Loader } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  type: 'percentile' | 'geo' | 'cache';
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '!=';
    value: number;
  };
  enabled: boolean;
  createdAt: number;
  notifications?: {
    email?: string[];
    slack?: string;
  };
}

export default function AlertsTab() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AlertRule>>({
    name: '',
    type: 'percentile',
    condition: { metric: 'p95', operator: '>', value: 1000 },
    enabled: true,
  });

  // 获取告警规则
  const { data: rulesData, isLoading } = useQuery(['alert-rules'], async () => {
    const response = await fetch('/api/alerts/rules');
    return response.json();
  });

  // 创建规则
  const createMutation = useMutation(
    async (rule: Partial<AlertRule>) => {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert-rules']);
        setIsAdding(false);
        resetForm();
      },
    }
  );

  // 更新规则
  const updateMutation = useMutation(
    async (rule: AlertRule) => {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert-rules']);
        setEditingId(null);
        resetForm();
      },
    }
  );

  // 删除规则
  const deleteMutation = useMutation(
    async (id: string) => {
      const response = await fetch(`/api/alerts/rules/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['alert-rules']);
      },
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'percentile',
      condition: { metric: 'p95', operator: '>', value: 1000 },
      enabled: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        ...formData,
        id: editingId,
        createdAt: Date.now(),
      } as AlertRule);
    } else {
      createMutation.mutate(formData);
    }
  };

  const rules = rulesData?.data || [];

  return (
    <div className="space-y-6">
      <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-300">
          🔔 配置性能告警规则，在异常发生时接收通知
        </p>
      </div>

      {/* 添加/编辑表单 */}
      {(isAdding || editingId) && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? '编辑规则' : '新建告警规则'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">规则名称</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                placeholder="例如: P95响应时间告警"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">告警类型</label>
                <select
                  value={formData.type || 'percentile'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as AlertRule['type'],
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                >
                  <option value="percentile">分位数</option>
                  <option value="cache">缓存</option>
                  <option value="geo">地理</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">指标</label>
                <input
                  type="text"
                  value={formData.condition?.metric || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: { ...formData.condition!, metric: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                  placeholder="例如: p95"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">操作符</label>
                <select
                  value={formData.condition?.operator || '>'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: { ...formData.condition!, operator: e.target.value as any },
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                >
                  <option value=">">大于 (&gt;)</option>
                  <option value="<">小于 (&lt;)</option>
                  <option value="==">等于 (==)</option>
                  <option value="!=">不等于 (!=)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">阈值</label>
                <input
                  type="number"
                  value={formData.condition?.value || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      condition: {
                        ...formData.condition!,
                        value: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300"
                  required
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled || false}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">启用</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-cf-orange hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isLoading || updateMutation.isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    保存规则
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 规则列表 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cf-orange" />
            告警规则
          </h3>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cf-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建规则
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {rules.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无告警规则，创建一个吧</p>
            ) : (
              rules.map((rule: AlertRule) => (
                <div key={rule.id} className="bg-gray-700 rounded p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{rule.name}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          rule.enabled ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-400'
                        }`}
                      >
                        {rule.enabled ? '启用' : '禁用'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      当 <code className="bg-gray-600 px-2 py-1 rounded">{rule.condition.metric}</code> {rule.condition.operator}{' '}
                      <code className="bg-gray-600 px-2 py-1 rounded">{rule.condition.value}</code>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      类型: {rule.type} | 创建于 {new Date(rule.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(rule.id);
                        setFormData(rule);
                      }}
                      className="p-2 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(rule.id)}
                      disabled={deleteMutation.isLoading}
                      className="p-2 hover:bg-red-900 rounded transition-colors text-gray-400 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 通知配置提示 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">通知配置</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>✉️ 邮件通知: 在规则触发时发送邮件通知(配置中)</p>
          <p>💬 Slack通知: 在规则触发时发送Slack消息(配置中)</p>
          <p>📱 Webhook: 自定义集成(配置中)</p>
        </div>
      </div>
    </div>
  );
}
