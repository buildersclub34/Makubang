
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { deliveryAPI } from '../services/api';

interface WalletTransaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'bonus' | 'penalty';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface WithdrawalMethod {
  id: string;
  type: 'bank' | 'upi' | 'paytm';
  details: {
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
    paytmNumber?: string;
  };
  isDefault: boolean;
}

export default function WalletScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch wallet data
  const { data: walletData, isLoading } = useQuery({
    queryKey: ['delivery-wallet'],
    queryFn: deliveryAPI.getWalletData,
    refetchInterval: 30000,
  });

  const { data: transactions } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: deliveryAPI.getWalletTransactions,
  });

  const { data: withdrawalMethods } = useQuery({
    queryKey: ['withdrawal-methods'],
    queryFn: deliveryAPI.getWithdrawalMethods,
  });

  // Mutations
  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: string; methodId: string }) => 
      deliveryAPI.requestWithdrawal(data.amount, data.methodId),
    onSuccess: () => {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      Alert.alert('Success', 'Withdrawal request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['delivery-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to process withdrawal request');
    },
  });

  const addMethodMutation = useMutation({
    mutationFn: deliveryAPI.addWithdrawalMethod,
    onSuccess: () => {
      setShowAddMethodModal(false);
      Alert.alert('Success', 'Payment method added successfully');
      queryClient.invalidateQueries({ queryKey: ['withdrawal-methods'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add payment method');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amount > (walletData?.availableBalance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a withdrawal method');
      return;
    }

    withdrawMutation.mutate({
      amount: withdrawAmount,
      methodId: selectedMethod,
    });
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Wallet Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(walletData?.availableBalance || 0)}
        </Text>
        <View style={styles.balanceDetails}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Pending</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(walletData?.pendingBalance || 0)}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Total Earned</Text>
            <Text style={styles.balanceItemValue}>
              {formatCurrency(walletData?.totalEarned || 0)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
          disabled={!walletData?.availableBalance || walletData.availableBalance <= 0}
        >
          <Icon name="account-balance-wallet" size={20} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw Money</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{formatCurrency(walletData?.weeklyEarnings || 0)}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="local-shipping" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{walletData?.weeklyDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="access-time" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{walletData?.averageTime || 0} min</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="star" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{(walletData?.weeklyRating || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactionsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {transactions?.slice(0, 10).map((transaction: WalletTransaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionIcon}>
              <Icon 
                name={getTransactionIcon(transaction.type)} 
                size={24} 
                color={getTransactionColor(transaction.type)} 
              />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.transactionAmount}>
              <Text style={[
                styles.transactionAmountText,
                { color: transaction.type === 'withdrawal' ? '#F44336' : '#4CAF50' }
              ]}>
                {transaction.type === 'withdrawal' ? '-' : '+'}
                {formatCurrency(transaction.amount)}
              </Text>
              <Text style={styles.transactionStatus}>
                {transaction.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Money</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
              />
              <Text style={styles.availableBalance}>
                Available: {formatCurrency(walletData?.availableBalance || 0)}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Withdrawal Method</Text>
              {withdrawalMethods?.map((method: WithdrawalMethod) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === method.id && styles.selectedMethodCard
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <Icon name="account-balance" size={20} color="#757575" />
                  <Text style={styles.methodText}>
                    {method.type.toUpperCase()} - 
                    {method.type === 'bank' && `****${method.details.accountNumber?.slice(-4)}`}
                    {method.type === 'upi' && method.details.upiId}
                    {method.type === 'paytm' && method.details.paytmNumber}
                  </Text>
                  {method.isDefault && (
                    <Text style={styles.defaultBadge}>Default</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.addMethodButton}
                onPress={() => setShowAddMethodModal(true)}
              >
                <Icon name="add" size={20} color="#2196F3" />
                <Text style={styles.addMethodText}>Add New Method</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleWithdraw}
                disabled={withdrawMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>
                  {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getTransactionIcon(type: string): string {
  switch (type) {
    case 'earning': return 'attach-money';
    case 'withdrawal': return 'account-balance-wallet';
    case 'bonus': return 'card-giftcard';
    case 'penalty': return 'remove-circle';
    default: return 'account-balance-wallet';
  }
}

function getTransactionColor(type: string): string {
  switch (type) {
    case 'earning': return '#4CAF50';
    case 'withdrawal': return '#F44336';
    case 'bonus': return '#FF9800';
    case 'penalty': return '#F44336';
    default: return '#757575';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: '#4CAF50',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceItemLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  balanceItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  withdrawButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  withdrawButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  transactionsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  availableBalance: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMethodCard: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  methodText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  addMethodText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  confirmButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { deliveryAPI } from '../services/api';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
  status: string;
}

interface EarningsSummary {
  currentBalance: number;
  totalEarnings: number;
  totalDeliveries: number;
  avgEarningsPerDelivery: number;
}

export default function WalletScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: deliveryAPI.getWallet,
  });

  const { data: earnings } = useQuery({
    queryKey: ['earnings', selectedPeriod],
    queryFn: () => deliveryAPI.getEarningsSummary(selectedPeriod),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => deliveryAPI.getTransactions(),
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: deliveryAPI.getWithdrawalHistory,
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; bankDetails: any }) =>
      deliveryAPI.requestWithdrawal(data.amount, data.bankDetails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      Alert.alert('Success', 'Withdrawal request submitted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit withdrawal request');
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹100');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolder) {
      Alert.alert('Error', 'Please fill all bank details');
      return;
    }

    withdrawMutation.mutate({ amount, bankDetails });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? 'arrow-downward' : 'arrow-upward';
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? '#4CAF50' : '#F44336';
  };

  if (walletLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet?.balance || 0)}
        </Text>
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
          disabled={!wallet?.balance || wallet.balance < 100}
        >
          <Icon name="account-balance-wallet" size={20} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Earnings Summary</Text>
          <View style={styles.periodSelector}>
            {(['today', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(earnings?.totalEarnings || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnings?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(earnings?.avgEarningsPerDelivery || 0)}
            </Text>
            <Text style={styles.statLabel}>Avg per Delivery</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactionsCard}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions?.items?.map((transaction: Transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionLeft}>
              <View style={[
                styles.transactionIcon,
                { backgroundColor: getTransactionColor(transaction.type) }
              ]}>
                <Icon 
                  name={getTransactionIcon(transaction.type)} 
                  size={16} 
                  color="#fff" 
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: getTransactionColor(transaction.type) }
            ]}>
              {transaction.type === 'credit' ? '+' : '-'}
              {formatCurrency(Math.abs(transaction.amount))}
            </Text>
          </View>
        ))}
      </View>

      {/* Withdrawal History */}
      <View style={styles.withdrawalsCard}>
        <Text style={styles.sectionTitle}>Withdrawal History</Text>
        {withdrawals?.map((withdrawal: any) => (
          <View key={withdrawal.id} style={styles.withdrawalItem}>
            <View style={styles.withdrawalInfo}>
              <Text style={styles.withdrawalAmount}>
                {formatCurrency(withdrawal.amount)}
              </Text>
              <Text style={styles.withdrawalDate}>
                Requested: {new Date(withdrawal.requestedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[
              styles.withdrawalStatus,
              { backgroundColor: getWithdrawalStatusColor(withdrawal.status) }
            ]}>
              <Text style={styles.withdrawalStatusText}>
                {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Withdrawal Amount</Text>
              <TextInput
                style={styles.input}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Enter amount (min ₹100)"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.accountNumber}
                onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
                placeholder="Enter account number"
              />

              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.ifscCode}
                onChangeText={(text) => setBankDetails({...bankDetails, ifscCode: text})}
                placeholder="Enter IFSC code"
              />

              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={bankDetails.accountHolder}
                onChangeText={(text) => setBankDetails({...bankDetails, accountHolder: text})}
                placeholder="Enter account holder name"
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleWithdraw}
                disabled={withdrawMutation.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {withdrawMutation.isPending ? 'Processing...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getWithdrawalStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#4CAF50';
    case 'failed': return '#F44336';
    case 'processing': return '#FF9800';
    default: return '#757575';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#fff',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#757575',
  },
  periodButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  transactionsCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  withdrawalsCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  withdrawalDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  withdrawalStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  withdrawalStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
