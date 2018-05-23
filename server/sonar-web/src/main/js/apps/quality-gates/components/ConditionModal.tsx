/*
 * SonarQube
 * Copyright (C) 2009-2018 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as React from 'react';
import AddConditionSelect from './AddConditionSelect';
import ConditionOperator from './ConditionOperator';
import ThresholdInput from './ThresholdInput';
import Period from './Period';
import { translate, getLocalizedMetricName } from '../../../helpers/l10n';
import { Metric, QualityGate, Condition } from '../../../app/types';
import { createCondition, updateCondition } from '../../../api/quality-gates';
import { isDiffMetric } from '../../../helpers/measures';
import { parseError } from '../../../helpers/request';
import ConfirmModal from '../../../components/controls/ConfirmModal';

interface Props {
  condition?: Condition;
  metric?: Metric;
  metrics?: Metric[];
  header: string;
  onAddCondition: (condition: Condition) => void;
  onClose: () => void;
  organization?: string;
  qualityGate: QualityGate;
}

interface State {
  error: string;
  errorMessage?: string;
  metric?: Metric;
  op?: string;
  period: boolean;
  submitting: boolean;
  warning: string;
}

export default class ConditionModal extends React.PureComponent<Props, State> {
  mounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      error: props.condition ? props.condition.error : '',
      period: props.condition ? props.condition.period === 1 : false,
      warning: props.condition ? props.condition.warning : '',
      metric: props.metric ? props.metric : undefined,
      op: props.condition ? props.condition.op : undefined,
      submitting: false
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  handleError = (error: any) => {
    if (this.mounted) {
      parseError(error).then(
        message => {
          this.setState({ errorMessage: message, submitting: false });
        },
        () => {
          this.setState({ submitting: false });
        }
      );
    }
  };

  getUpdatedCondition = (metric: Metric) => {
    const data: Condition = {
      metric: metric.key,
      op: metric.type === 'RATING' ? 'GT' : this.state.op,
      warning: this.state.warning,
      error: this.state.error
    };

    const { period } = this.state;
    if (period && metric.type !== 'RATING') {
      data.period = period ? 1 : 0;
    }

    if (isDiffMetric(metric.key)) {
      data.period = 1;
    }
    return data;
  };

  handleConditionResponse = (newCondition: Condition) => {
    this.props.onAddCondition(newCondition);
    this.props.onClose();
  };

  handleFormSubmit = () => {
    if (this.state.metric) {
      const { condition, qualityGate, organization } = this.props;
      this.setState({ submitting: true });

      if (condition) {
        const data: Condition = {
          id: condition.id,
          ...this.getUpdatedCondition(this.state.metric)
        };

        updateCondition({ organization, ...data }).then(
          this.handleConditionResponse,
          this.handleError
        );
      } else {
        const data = this.getUpdatedCondition(this.state.metric);

        createCondition({ gateId: qualityGate.id, organization, ...data }).then(
          this.handleConditionResponse,
          this.handleError
        );
      }
    }
  };

  handleChooseType = (metric: Metric) => {
    this.setState({ metric });
  };

  handlePeriodChange = (period: boolean) => {
    this.setState({ period });
  };

  handleOperatorChange = (op: string) => {
    this.setState({ op });
  };

  handleWarningChange = (warning: string) => {
    this.setState({ warning });
  };

  handleErrorChange = (error: string) => {
    this.setState({ error });
  };

  render() {
    const { header, metrics, onClose } = this.props;
    const { period, op, warning, error, metric } = this.state;
    return (
      <ConfirmModal
        confirmButtonText={header}
        header={header}
        onClose={onClose}
        onConfirm={this.handleFormSubmit}>
        {this.state.errorMessage && (
          <div className="alert alert-warning modal-alert">{this.state.errorMessage}</div>
        )}
        <div className="modal-field">
          <label htmlFor="create-user-login">{translate('quality_gates.conditions.metric')}</label>
          {metrics && (
            <AddConditionSelect metrics={metrics} onAddCondition={this.handleChooseType} />
          )}
          {this.props.metric && (
            <span className="note">{getLocalizedMetricName(this.props.metric)}</span>
          )}
        </div>
        {metric && (
          <>
            <div className="modal-field">
              <label>{translate('quality_gates.conditions.leak')}</label>
              <Period
                canEdit={true}
                metric={metric}
                onPeriodChange={this.handlePeriodChange}
                period={period}
              />
            </div>
            <div className="modal-field">
              <label>{translate('quality_gates.conditions.operator')}</label>
              <ConditionOperator
                canEdit={true}
                metric={metric}
                onOperatorChange={this.handleOperatorChange}
                op={op}
              />
            </div>
            <div className="modal-field">
              <label>{translate('quality_gates.conditions.warning')}</label>
              <ThresholdInput
                metric={metric}
                name="warning"
                onChange={this.handleWarningChange}
                value={warning}
              />
            </div>
            <div className="modal-field">
              <label>{translate('quality_gates.conditions.error')}</label>
              <ThresholdInput
                metric={metric}
                name="error"
                onChange={this.handleErrorChange}
                value={error}
              />
            </div>
          </>
        )}
      </ConfirmModal>
    );
  }
}
