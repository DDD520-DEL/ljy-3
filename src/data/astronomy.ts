import type { SpectralLine, MKTemplate } from '@/types';

export const SPECTRAL_LINES: SpectralLine[] = [
  { element: 'H', ion: 'I', label: 'Hα', wavelength: 6562.8, color: '#ff4444', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=3 → n=2', ewRangeMin: 0.5, ewRangeMax: 25, description: '巴尔末系α线，最强氢线，恒星分类最重要谱线之一' },
  { element: 'H', ion: 'I', label: 'Hβ', wavelength: 4861.3, color: '#ff6666', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=4 → n=2', ewRangeMin: 0.3, ewRangeMax: 15, description: '巴尔末系β线，常用于测光温度估计' },
  { element: 'H', ion: 'I', label: 'Hγ', wavelength: 4340.5, color: '#ff8888', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=5 → n=2', ewRangeMin: 0.2, ewRangeMax: 10, description: '巴尔末系γ线' },
  { element: 'H', ion: 'I', label: 'Hδ', wavelength: 4101.7, color: '#ff9999', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=6 → n=2', ewRangeMin: 0.15, ewRangeMax: 8, description: '巴尔末系δ线' },
  { element: 'H', ion: 'I', label: 'Hε', wavelength: 3970.1, color: '#ffaaaa', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=7 → n=2', ewRangeMin: 0.1, ewRangeMax: 6, description: '巴尔末系ε线，靠近Ca II H线' },
  { element: 'H', ion: 'I', label: 'Hζ', wavelength: 3889.0, color: '#ffbbbb', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=8 → n=2', ewRangeMin: 0.08, ewRangeMax: 5, description: '巴尔末系ζ线' },
  { element: 'H', ion: 'I', label: 'Hη', wavelength: 3835.4, color: '#ffcccc', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=9 → n=2', ewRangeMin: 0.06, ewRangeMax: 4, description: '巴尔末系η线' },
  { element: 'H', ion: 'I', label: 'Hθ', wavelength: 3797.9, color: '#ffdddd', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=10 → n=2', ewRangeMin: 0.05, ewRangeMax: 3, description: '巴尔末系θ线' },
  { element: 'H', ion: 'I', label: 'Hι', wavelength: 3770.6, color: '#ffe0e0', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=11 → n=2', ewRangeMin: 0.04, ewRangeMax: 2.5, description: '巴尔末系ι线' },
  { element: 'H', ion: 'I', label: 'Hκ', wavelength: 3750.1, color: '#ffe5e5', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=12 → n=2', ewRangeMin: 0.03, ewRangeMax: 2, description: '巴尔末系κ线' },
  { element: 'H', ion: 'I', label: 'Paα', wavelength: 18751.0, color: '#ff3333', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=4 → n=3', ewRangeMin: 0.2, ewRangeMax: 8, description: '帕邢系α线（近红外）' },
  { element: 'H', ion: 'I', label: 'Brγ', wavelength: 21661.2, color: '#ff2222', category: 'hydrogen', periodicGroup: 'nonmetal', transition: 'n=7 → n=4', ewRangeMin: 0.1, ewRangeMax: 5, description: '布拉开系γ线（红外）' },

  { element: 'He', ion: 'I', label: 'He I 10830', wavelength: 10830.3, color: '#3399ff', category: 'helium', periodicGroup: 'noble_gas', transition: '2³S → 2³P', ewRangeMin: 0.1, ewRangeMax: 5, description: '氦I红外线，色球活动指标' },
  { element: 'He', ion: 'I', label: 'He I 7065', wavelength: 7065.2, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '3³S → 2³P', ewRangeMin: 0.05, ewRangeMax: 3, description: '氦I红光线，O/B型星可见' },
  { element: 'He', ion: 'I', label: 'He I 6678', wavelength: 6678.2, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2¹P → 3¹D', ewRangeMin: 0.05, ewRangeMax: 3, description: '氦I线，B型星重要指标' },
  { element: 'He', ion: 'I', label: 'He I 5876', wavelength: 5875.6, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2³P → 3³D', ewRangeMin: 0.08, ewRangeMax: 4, description: '氦I D3线，与Na I D线近邻，B型星显著' },
  { element: 'He', ion: 'I', label: 'He I 5016', wavelength: 5015.7, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2¹P → 3¹S', ewRangeMin: 0.05, ewRangeMax: 2.5, description: '氦I蓝光线' },
  { element: 'He', ion: 'I', label: 'He I 4713', wavelength: 4713.1, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2³P → 4³S', ewRangeMin: 0.03, ewRangeMax: 2, description: '氦I线' },
  { element: 'He', ion: 'I', label: 'He I 4471', wavelength: 4471.5, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2³P → 4³D', ewRangeMin: 0.1, ewRangeMax: 5, description: '氦I最强线之一，B型星分类关键线' },
  { element: 'He', ion: 'I', label: 'He I 4026', wavelength: 4026.2, color: '#44aaff', category: 'helium', periodicGroup: 'noble_gas', transition: '2¹P → 5¹S', ewRangeMin: 0.05, ewRangeMax: 3, description: '氦I近紫外线' },
  { element: 'He', ion: 'II', label: 'He II 5412', wavelength: 5411.5, color: '#2288ff', category: 'helium', periodicGroup: 'noble_gas', transition: 'n=5 → n=4', ewRangeMin: 0.05, ewRangeMax: 3, description: '电离氦线，O型星特征' },
  { element: 'He', ion: 'II', label: 'He II 4686', wavelength: 4685.7, color: '#2288ff', category: 'helium', periodicGroup: 'noble_gas', transition: 'n=4 → n=3', ewRangeMin: 0.1, ewRangeMax: 6, description: '电离氦最强线，O型星/WR星特征，He II 4686/He I 4471比值用于O型细分' },
  { element: 'He', ion: 'II', label: 'He II 4542', wavelength: 4541.6, color: '#2288ff', category: 'helium', periodicGroup: 'noble_gas', transition: 'n=6 → n=4', ewRangeMin: 0.05, ewRangeMax: 2.5, description: '电离氦线' },
  { element: 'He', ion: 'II', label: 'He II 4200', wavelength: 4199.8, color: '#2288ff', category: 'helium', periodicGroup: 'noble_gas', transition: 'n=7 → n=4', ewRangeMin: 0.03, ewRangeMax: 2, description: '电离氦线' },
  { element: 'He', ion: 'II', label: 'He II 3203', wavelength: 3203.1, color: '#2288ff', category: 'helium', periodicGroup: 'noble_gas', transition: 'n=5 → n=3', ewRangeMin: 0.05, ewRangeMax: 2, description: '电离氦紫外 Pickering 线系' },

  { element: 'Li', ion: 'I', label: 'Li I 6708', wavelength: 6707.8, color: '#ff77aa', category: 'metal', periodicGroup: 'alkali', transition: '2²S → 2²P', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '锂共振线，年轻恒星/金属贫乏星指标' },
  { element: 'C', ion: 'II', label: 'C II 4267', wavelength: 4267.3, color: '#ff66ff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.5, description: '碳II线，B/A型星可见' },
  { element: 'C', ion: 'III', label: 'C III 4647', wavelength: 4647.4, color: '#ff88ff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '碳III线，O/B型星，常与N III 4634/4640形成4640-4650发射特征' },
  { element: 'C', ion: 'III', label: 'C III 5696', wavelength: 5696.0, color: '#ff88ff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '碳III线' },
  { element: 'C', ion: 'IV', label: 'C IV 5801', wavelength: 5801.3, color: '#ff55ff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2.5, description: '碳IV线，WR星（WC型）特征' },
  { element: 'N', ion: 'II', label: 'N II 3995', wavelength: 3995.0, color: '#66ffff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '氮II线' },
  { element: 'N', ion: 'III', label: 'N III 4634', wavelength: 4634.1, color: '#88ffff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '氮III线，O型星，与C III 4647形成4640-4650发射复合体' },
  { element: 'N', ion: 'III', label: 'N III 4640', wavelength: 4640.6, color: '#88ffff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.8, description: '氮III线' },
  { element: 'N', ion: 'III', label: 'N III 5320', wavelength: 5320.0, color: '#88ffff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '氮III线' },
  { element: 'N', ion: 'V', label: 'N V 4604', wavelength: 4604.0, color: '#44ffff', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '氮V线，最热O型星和WN型WR星特征' },
  { element: 'O', ion: 'I', label: 'O I 7774', wavelength: 7774.1, color: '#66ff99', category: 'metal', periodicGroup: 'nonmetal', transition: '2p⁴ ³P → 3s ³S', ewRangeMin: 0.05, ewRangeMax: 2, description: '氧I近红外三线，FGK型星可见' },
  { element: 'O', ion: 'I', label: 'O I 8446', wavelength: 8446.4, color: '#66ff99', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.5, description: '氧I红外线' },
  { element: 'O', ion: 'II', label: 'O II 4070', wavelength: 4069.9, color: '#44dd88', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '氧II线，O/B型星' },
  { element: 'O', ion: 'III', label: 'O III 5592', wavelength: 5592.3, color: '#33cc77', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '氧III线' },
  { element: 'Ne', ion: 'I', label: 'Ne I 6402', wavelength: 6402.3, color: '#aa99ff', category: 'metal', periodicGroup: 'noble_gas', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '氖I线' },
  { element: 'Na', ion: 'I', label: 'Na I D2', wavelength: 5889.9, color: '#ffee44', category: 'metal', periodicGroup: 'alkali', transition: '3²S₁/₂ → 3²P₃/₂', ewRangeMin: 0.1, ewRangeMax: 5, description: '钠I D2线，星际消光/ISM探针，FGK星显著' },
  { element: 'Na', ion: 'I', label: 'Na I D1', wavelength: 5895.9, color: '#ffee44', category: 'metal', periodicGroup: 'alkali', transition: '3²S₁/₂ → 3²P₁/₂', ewRangeMin: 0.08, ewRangeMax: 4, description: '钠I D1线，与D2线为著名的钠双线' },
  { element: 'Mg', ion: 'I', label: 'Mg I b4', wavelength: 5167.3, color: '#88ff88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '3s3p ³P → 3s3d ³D', ewRangeMin: 0.1, ewRangeMax: 3, description: '镁I b线系成员' },
  { element: 'Mg', ion: 'I', label: 'Mg I b2', wavelength: 5172.7, color: '#88ff88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '3s3p ³P → 3s3d ³D', ewRangeMin: 0.15, ewRangeMax: 4, description: '镁I b线系成员' },
  { element: 'Mg', ion: 'I', label: 'Mg I b1', wavelength: 5183.6, color: '#88ff88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '3s3p ³P → 3s3d ³D', ewRangeMin: 0.12, ewRangeMax: 3.5, description: '镁I b线系成员，晚型星重要金属丰度指标' },
  { element: 'Mg', ion: 'II', label: 'Mg II 4481', wavelength: 4481.2, color: '#77ee77', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.08, ewRangeMax: 3, description: '镁II线，A型星可见' },
  { element: 'Mg', ion: 'II', label: 'Mg II k', wavelength: 2795.5, color: '#77ee77', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.5, ewRangeMax: 10, description: '镁II k线（紫外），恒星色球活动指标' },
  { element: 'Al', ion: 'I', label: 'Al I 3944', wavelength: 3944.0, color: '#aaffcc', category: 'metal', periodicGroup: 'post_transition', transition: '', ewRangeMin: 0.05, ewRangeMax: 1.5, description: '铝I线' },
  { element: 'Si', ion: 'II', label: 'Si II 6347', wavelength: 6347.1, color: '#aa88ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.08, ewRangeMax: 3, description: '硅II线，A型星可见，Be星常出现发射' },
  { element: 'Si', ion: 'II', label: 'Si II 6371', wavelength: 6371.4, color: '#aa88ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.06, ewRangeMax: 2.5, description: '硅II线，与6347形成双线' },
  { element: 'Si', ion: 'II', label: 'Si II 4128', wavelength: 4128.1, color: '#aa88ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '硅II线' },
  { element: 'Si', ion: 'II', label: 'Si II 3856', wavelength: 3856.0, color: '#aa88ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '硅II线' },
  { element: 'Si', ion: 'III', label: 'Si III 4552', wavelength: 4552.6, color: '#9977ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '硅III线，B型星' },
  { element: 'Si', ion: 'IV', label: 'Si IV 4116', wavelength: 4116.1, color: '#8866ff', category: 'metal', periodicGroup: 'metalloid', transition: '', ewRangeMin: 0.05, ewRangeMax: 2.5, description: '硅IV线，O型星' },
  { element: 'P', ion: 'I', label: 'P I 9797', wavelength: 9796.9, color: '#cccc66', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.5, description: '磷I红外' },
  { element: 'S', ion: 'I', label: 'S I 9228', wavelength: 9228.1, color: '#ddaa66', category: 'metal', periodicGroup: 'nonmetal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.5, description: '硫I红外' },
  { element: 'Cl', ion: 'I', label: 'Cl I 9121', wavelength: 9121.3, color: '#cc9966', category: 'metal', periodicGroup: 'halogen', transition: '', ewRangeMin: 0.01, ewRangeMax: 0.3, description: '氯I红外' },
  { element: 'K', ion: 'I', label: 'K I 7665', wavelength: 7664.9, color: '#ffcc66', category: 'metal', periodicGroup: 'alkali', transition: '4²S → 4²P', ewRangeMin: 0.08, ewRangeMax: 3, description: '钾I共振双线K线，近红外' },
  { element: 'K', ion: 'I', label: 'K I 7699', wavelength: 7698.9, color: '#ffcc66', category: 'metal', periodicGroup: 'alkali', transition: '4²S → 4²P', ewRangeMin: 0.05, ewRangeMax: 2, description: '钾I共振双线' },
  { element: 'K', ion: 'I', label: 'K I 4044', wavelength: 4044.1, color: '#ffcc66', category: 'metal', periodicGroup: 'alkali', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '钾I线' },
  { element: 'Ca', ion: 'II', label: 'Ca II H', wavelength: 3968.5, color: '#ffaa44', category: 'metal', periodicGroup: 'alkaline_earth', transition: '4²S → 4²P', ewRangeMin: 0.5, ewRangeMax: 15, description: '钙II H线，与K线合称H&K线，FGK星最显著特征，恒星活动指标' },
  { element: 'Ca', ion: 'II', label: 'Ca II K', wavelength: 3933.7, color: '#ffaa44', category: 'metal', periodicGroup: 'alkaline_earth', transition: '4²S → 4²P', ewRangeMin: 0.8, ewRangeMax: 20, description: '钙II K线，比H线略强，晚型星光谱最突出吸收线' },
  { element: 'Ca', ion: 'II', label: 'Ca II 8498', wavelength: 8498.0, color: '#ff9933', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.1, ewRangeMax: 3, description: '钙II红外三线' },
  { element: 'Ca', ion: 'II', label: 'Ca II 8542', wavelength: 8542.1, color: '#ff9933', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.15, ewRangeMax: 4, description: '钙II红外三线，最强' },
  { element: 'Ca', ion: 'II', label: 'Ca II 8662', wavelength: 8662.1, color: '#ff9933', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.1, ewRangeMax: 3, description: '钙II红外三线' },
  { element: 'Ca', ion: 'I', label: 'Ca I 4227', wavelength: 4226.7, color: '#ffbb55', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.08, ewRangeMax: 2.5, description: '钙I共振线，晚型星可见' },
  { element: 'Sc', ion: 'II', label: 'Sc II 4247', wavelength: 4246.8, color: '#ccaa88', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '钪II线，金属丰度指标' },
  { element: 'Ti', ion: 'II', label: 'Ti II 3384', wavelength: 3383.8, color: '#bbaa99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '钛II线，金属丰度敏感' },
  { element: 'Ti', ion: 'II', label: 'Ti II 3759', wavelength: 3759.3, color: '#bbaa99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '钛II线' },
  { element: 'V', ion: 'I', label: 'V I 4379', wavelength: 4379.2, color: '#aaaa88', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '钒I线' },
  { element: 'Cr', ion: 'I', label: 'Cr I 4254', wavelength: 4254.3, color: '#99aabb', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铬I线' },
  { element: 'Mn', ion: 'I', label: 'Mn I 4030', wavelength: 4030.8, color: '#8899aa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '锰I三线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 3750', wavelength: 3749.5, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '铁I线，金属丰度指标' },
  { element: 'Fe', ion: 'I', label: 'Fe I 3820', wavelength: 3820.4, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4046', wavelength: 4045.8, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4063', wavelength: 4063.6, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.8, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4271', wavelength: 4271.8, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.5, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4325', wavelength: 4325.8, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 1.8, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4383', wavelength: 4383.5, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.06, ewRangeMax: 2, description: '铁I线，靠近Hγ' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4405', wavelength: 4404.8, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.5, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4871', wavelength: 4871.3, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁I线，靠近Hβ' },
  { element: 'Fe', ion: 'I', label: 'Fe I 4920', wavelength: 4920.5, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.5, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5001', wavelength: 5001.9, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5169', wavelength: 5169.0, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.05, ewRangeMax: 2, description: '铁I线，与Mg I b线近邻' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5270', wavelength: 5270.4, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.5, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5328', wavelength: 5328.0, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5397', wavelength: 5397.1, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁I线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 5853', wavelength: 5852.8, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '铁I线，靠近Na D线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 6173', wavelength: 6173.3, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁I线，塞曼效应敏感，磁场测量常用' },
  { element: 'Fe', ion: 'I', label: 'Fe I 6302', wavelength: 6302.5, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁I线，太阳磁场测量谱线' },
  { element: 'Fe', ion: 'I', label: 'Fe I 6393', wavelength: 6393.6, color: '#aaffaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁I线' },
  { element: 'Fe', ion: 'II', label: 'Fe II 4233', wavelength: 4233.2, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁II线' },
  { element: 'Fe', ion: 'II', label: 'Fe II 4352', wavelength: 4351.7, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁II线' },
  { element: 'Fe', ion: 'II', label: 'Fe II 4924', wavelength: 4923.9, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.04, ewRangeMax: 1.5, description: '铁II线，靠近Hβ' },
  { element: 'Fe', ion: 'II', label: 'Fe II 5018', wavelength: 5018.4, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁II线' },
  { element: 'Fe', ion: 'II', label: 'Fe II 5169', wavelength: 5169.0, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '铁II线' },
  { element: 'Fe', ion: 'II', label: 'Fe II 6456', wavelength: 6456.4, color: '#99ee99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '铁II线，靠近Hα' },
  { element: 'Co', ion: 'I', label: 'Co I 3405', wavelength: 3405.1, color: '#889988', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '钴I线' },
  { element: 'Ni', ion: 'I', label: 'Ni I 3415', wavelength: 3414.8, color: '#99bb99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '镍I线' },
  { element: 'Ni', ion: 'I', label: 'Ni I 3524', wavelength: 3524.5, color: '#99bb99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 1, description: '镍I线' },
  { element: 'Ni', ion: 'I', label: 'Ni I 3858', wavelength: 3858.3, color: '#99bb99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.03, ewRangeMax: 0.8, description: '镍I线' },
  { element: 'Ni', ion: 'I', label: 'Ni I 5080', wavelength: 5080.5, color: '#99bb99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '镍I线' },
  { element: 'Cu', ion: 'I', label: 'Cu I 3247', wavelength: 3247.5, color: '#cc9977', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.5, description: '铜I共振线' },
  { element: 'Zn', ion: 'I', label: 'Zn I 3302', wavelength: 3302.6, color: '#bbbb99', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '锌I线' },
  { element: 'Sr', ion: 'II', label: 'Sr II 4078', wavelength: 4077.7, color: '#bbddaa', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.5, description: '锶II线，金属丰度/年龄指标' },
  { element: 'Sr', ion: 'II', label: 'Sr II 4215', wavelength: 4215.5, color: '#bbddaa', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.2, description: '锶II线' },
  { element: 'Y', ion: 'II', label: 'Y II 4375', wavelength: 4374.9, color: '#99ccbb', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '钇II线' },
  { element: 'Zr', ion: 'II', label: 'Zr II 4149', wavelength: 4149.2, color: '#aaccbb', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '锆II线' },
  { element: 'Ba', ion: 'II', label: 'Ba II 4554', wavelength: 4554.0, color: '#ddbb88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.03, ewRangeMax: 1.5, description: '钡II线，s-过程中子俘获元素，AGB星/富钡星指标' },
  { element: 'Ba', ion: 'II', label: 'Ba II 4934', wavelength: 4934.1, color: '#ddbb88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.02, ewRangeMax: 1, description: '钡II线' },
  { element: 'Ba', ion: 'II', label: 'Ba II 6141', wavelength: 6141.7, color: '#ddbb88', category: 'metal', periodicGroup: 'alkaline_earth', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.8, description: '钡II线' },
  { element: 'La', ion: 'II', label: 'La II 4086', wavelength: 4086.7, color: '#ccbbaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '镧II线，稀土元素' },
  { element: 'Ce', ion: 'II', label: 'Ce II 4012', wavelength: 4012.4, color: '#ccbbaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.6, description: '铈II线' },
  { element: 'Nd', ion: 'II', label: 'Nd II 3863', wavelength: 3863.4, color: '#ccbbaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.5, description: '钕II线' },
  { element: 'Eu', ion: 'II', label: 'Eu II 4129', wavelength: 4129.7, color: '#ccbbaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.02, ewRangeMax: 0.5, description: '铕II线，r-过程元素，核合成探针' },
  { element: 'Gd', ion: 'II', label: 'Gd II 4252', wavelength: 4251.7, color: '#ccbbaa', category: 'metal', periodicGroup: 'transition_metal', transition: '', ewRangeMin: 0.01, ewRangeMax: 0.4, description: '钆II线' },
];

export const PERIODIC_GROUP_LABELS: Record<string, { label: string; color: string; order: number }> = {
  nonmetal: { label: '非金属 (H, C, N, O, S, P)', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50', order: 1 },
  noble_gas: { label: '稀有气体 (He, Ne)', color: 'bg-sky-900/40 text-sky-300 border-sky-700/50', order: 2 },
  alkali: { label: '碱金属 (Li, Na, K)', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50', order: 3 },
  alkaline_earth: { label: '碱土金属 (Mg, Ca, Sr, Ba)', color: 'bg-orange-900/40 text-orange-300 border-orange-700/50', order: 4 },
  metalloid: { label: '准金属 (Si)', color: 'bg-violet-900/40 text-violet-300 border-violet-700/50', order: 5 },
  post_transition: { label: '主族金属 (Al)', color: 'bg-teal-900/40 text-teal-300 border-teal-700/50', order: 6 },
  transition_metal: { label: '过渡金属 (Ti, Fe, Ni, Zn, 稀土)', color: 'bg-slate-700/60 text-slate-300 border-slate-600/60', order: 7 },
  halogen: { label: '卤素 (Cl)', color: 'bg-pink-900/40 text-pink-300 border-pink-700/50', order: 8 },
};

export const ELEMENT_NAMES: Record<string, string> = {
  H: '氢', He: '氦', Li: '锂', C: '碳', N: '氮', O: '氧', Ne: '氖', Na: '钠',
  Mg: '镁', Al: '铝', Si: '硅', P: '磷', S: '硫', Cl: '氯', K: '钾', Ca: '钙',
  Sc: '钪', Ti: '钛', V: '钒', Cr: '铬', Mn: '锰', Fe: '铁', Co: '钴', Ni: '镍',
  Cu: '铜', Zn: '锌', Sr: '锶', Y: '钇', Zr: '锆', Ba: '钡', La: '镧', Ce: '铈',
  Nd: '钕', Eu: '铕', Gd: '钆',
};

export const MK_TEMPLATES: MKTemplate[] = [
  {
    spectralType: 'O',
    luminosityClass: 'V',
    label: 'O5V',
    colorTemp: 42000,
    lineRatios: { 'HeII4686/HeI4471': 1.5, 'HeI4471/Hβ': 0.8, 'Hα/Hβ': 2.5 },
  },
  {
    spectralType: 'O',
    luminosityClass: 'V',
    label: 'O9V',
    colorTemp: 32000,
    lineRatios: { 'HeII4686/HeI4471': 0.8, 'HeI4471/Hβ': 0.6, 'Hα/Hβ': 2.8 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B0V',
    colorTemp: 29000,
    lineRatios: { 'HeII4686/HeI4471': 0.3, 'HeI4471/Hβ': 0.8, 'Hα/Hβ': 3.0 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B5V',
    colorTemp: 15400,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.5, 'Hα/Hβ': 3.2 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'V',
    label: 'B8V',
    colorTemp: 11900,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.2, 'Hα/Hβ': 3.3 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'V',
    label: 'A0V',
    colorTemp: 9600,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.05, 'Hα/Hβ': 3.5, 'CaII_H/Hδ': 0.2 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'V',
    label: 'A5V',
    colorTemp: 8200,
    lineRatios: { 'HeII4686/HeI4471': 0.0, 'HeI4471/Hβ': 0.0, 'Hα/Hβ': 3.3, 'CaII_H/Hδ': 0.5 },
  },
  {
    spectralType: 'F',
    luminosityClass: 'V',
    label: 'F0V',
    colorTemp: 7350,
    lineRatios: { 'Hα/Hβ': 2.8, 'CaII_K/Hγ': 0.8, 'CaII_H/Hδ': 1.0 },
  },
  {
    spectralType: 'F',
    luminosityClass: 'V',
    label: 'F5V',
    colorTemp: 6550,
    lineRatios: { 'Hα/Hβ': 2.3, 'CaII_K/Hγ': 1.2, 'CaII_H/Hδ': 1.5 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G0V',
    colorTemp: 6050,
    lineRatios: { 'Hα/Hβ': 2.0, 'CaII_K/Hγ': 1.6, 'NaI_D/Hβ': 0.3 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G2V',
    colorTemp: 5770,
    lineRatios: { 'Hα/Hβ': 1.9, 'CaII_K/Hγ': 1.8, 'NaI_D/Hβ': 0.4, 'MgI_b/Hβ': 0.5 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'V',
    label: 'G5V',
    colorTemp: 5660,
    lineRatios: { 'Hα/Hβ': 1.8, 'CaII_K/Hγ': 2.0, 'NaI_D/Hβ': 0.5, 'MgI_b/Hβ': 0.6 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'V',
    label: 'K0V',
    colorTemp: 5240,
    lineRatios: { 'Hα/Hβ': 1.5, 'CaII_K/Hγ': 2.5, 'NaI_D/Hβ': 0.7, 'MgI_b/Hβ': 0.8 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'V',
    label: 'K5V',
    colorTemp: 4350,
    lineRatios: { 'Hα/Hβ': 1.2, 'CaII_K/Hγ': 3.0, 'NaI_D/Hβ': 1.0, 'MgI_b/Hβ': 1.2 },
  },
  {
    spectralType: 'M',
    luminosityClass: 'V',
    label: 'M0V',
    colorTemp: 3850,
    lineRatios: { 'Hα/Hβ': 1.0, 'CaII_K/Hγ': 3.5, 'NaI_D/Hβ': 1.3, 'TiO_visible': 1.0 },
  },
  {
    spectralType: 'M',
    luminosityClass: 'V',
    label: 'M5V',
    colorTemp: 3240,
    lineRatios: { 'Hα/Hβ': 0.8, 'CaII_K/Hγ': 4.0, 'NaI_D/Hβ': 1.6, 'TiO_visible': 2.0 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'I',
    label: 'B0Ia',
    colorTemp: 26000,
    lineRatios: { 'HeI4471/Hβ': 0.6, 'Hα/Hβ': 4.0, 'SiII6347/Hβ': 0.3 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'I',
    label: 'A0Ia',
    colorTemp: 9730,
    lineRatios: { 'Hα/Hβ': 4.5, 'CaII_H/Hδ': 0.3 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'I',
    label: 'G2Ia',
    colorTemp: 5550,
    lineRatios: { 'Hα/Hβ': 2.5, 'CaII_K/Hγ': 2.2, 'NaI_D/Hβ': 0.3 },
  },
  {
    spectralType: 'B',
    luminosityClass: 'III',
    label: 'B5III',
    colorTemp: 15000,
    lineRatios: { 'HeI4471/Hβ': 0.4, 'Hα/Hβ': 3.5 },
  },
  {
    spectralType: 'A',
    luminosityClass: 'III',
    label: 'A5III',
    colorTemp: 8200,
    lineRatios: { 'Hα/Hβ': 3.8, 'CaII_H/Hδ': 0.4 },
  },
  {
    spectralType: 'G',
    luminosityClass: 'III',
    label: 'G8III',
    colorTemp: 4900,
    lineRatios: { 'Hα/Hβ': 2.0, 'CaII_K/Hγ': 2.0, 'NaI_D/Hβ': 0.6 },
  },
  {
    spectralType: 'K',
    luminosityClass: 'III',
    label: 'K5III',
    colorTemp: 3990,
    lineRatios: { 'Hα/Hβ': 1.3, 'CaII_K/Hγ': 3.0, 'NaI_D/Hβ': 1.0, 'MgI_b/Hβ': 1.0 },
  },
];

export const WAVELENGTH_RANGES = {
  optical: { min: 3800, max: 7500, label: '可见光' },
  blue: { min: 3800, max: 5000, label: '蓝光区' },
  green: { min: 5000, max: 5800, label: '绿光区' },
  red: { min: 5800, max: 7500, label: '红光区' },
  uv: { min: 2800, max: 3800, label: '近紫外' },
  nir: { min: 7500, max: 25000, label: '近红外' },
};

export const generateSampleSpectrum = (spectralType: string = 'A5V', noise: number = 0.02) => {
  const points: { wavelength: number; intensity: number }[] = [];
  const template = MK_TEMPLATES.find(t => t.label === spectralType) || MK_TEMPLATES[11];

  for (let wl = 3800; wl <= 7500; wl += 2) {
    let intensity = 1.0;
    const temp = template.colorTemp;
    const wlMicron = wl / 10000;
    const bbTop = 2.898e-3 / temp * 1e4;
    const bbRatio = Math.exp(-1.4388 / (wlMicron * temp / 10000)) / Math.exp(-1.4388 / (bbTop / 10000 * temp / 10000));
    intensity = bbRatio;

    for (const line of SPECTRAL_LINES) {
      const dist = Math.abs(wl - line.wavelength);
      if (dist < 50) {
        let depth = 0;
        if (line.category === 'hydrogen') {
          if (template.spectralType === 'O') depth = 0.05;
          else if (template.spectralType === 'B') depth = 0.15;
          else if (template.spectralType === 'A') depth = line.label === 'Hα' ? 0.4 : 0.35;
          else if (template.spectralType === 'F') depth = line.label === 'Hα' ? 0.25 : 0.2;
          else if (template.spectralType === 'G') depth = line.label === 'Hα' ? 0.15 : 0.12;
          else if (template.spectralType === 'K') depth = line.label === 'Hα' ? 0.08 : 0.06;
          else if (template.spectralType === 'M') depth = line.label === 'Hα' ? 0.04 : 0.03;
        } else if (line.category === 'helium') {
          if (template.spectralType === 'O') depth = line.ion === 'II' ? 0.3 : 0.2;
          else if (template.spectralType === 'B') depth = line.ion === 'II' ? 0.05 : 0.25;
          else if (template.spectralType === 'A') depth = 0.03;
        } else if (line.category === 'metal') {
          if (template.spectralType === 'O' || template.spectralType === 'B') depth = 0.02;
          else if (template.spectralType === 'A') depth = 0.05;
          else if (template.spectralType === 'F') depth = 0.15;
          else if (template.spectralType === 'G') depth = 0.25;
          else if (template.spectralType === 'K') depth = 0.35;
          else if (template.spectralType === 'M') depth = 0.45;
        }
        const sigma = 8;
        const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        intensity -= depth * gaussian;
      }
    }

    intensity += (Math.random() - 0.5) * noise;
    intensity = Math.max(0.05, Math.min(1.5, intensity));

    points.push({ wavelength: wl, intensity });
  }

  const maxInt = Math.max(...points.map(p => p.intensity));
  return points.map(p => ({ wavelength: p.wavelength, intensity: p.intensity / maxInt }));
};
