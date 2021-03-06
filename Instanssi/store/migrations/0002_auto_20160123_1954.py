# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-01-23 19:54


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='storeitem',
            name='discount_amount',
            field=models.IntegerField(default=-1, help_text='Pienin m\xe4\xe4r\xe4 tuotteita joka oikeuttaa alennukseen', verbose_name='Alennusm\xe4\xe4r\xe4'),
        ),
        migrations.AddField(
            model_name='storeitem',
            name='discount_percentage',
            field=models.IntegerField(default=0, help_text='Alennuksen m\xe4\xe4r\xe4 prosentteina kun tuotteiden m\xe4\xe4r\xe4 saavuttaa alennusm\xe4\xe4r\xe4n.', verbose_name='Alennusprosentti'),
        ),
        migrations.AddField(
            model_name='transactionitem',
            name='original_price',
            field=models.IntegerField(default=0, help_text='Tuotteen hinta ostoshetkell\xe4 ilman alennuksia', verbose_name='Tuotteen alkuper\xe4inen hinta'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='storeitem',
            name='price',
            field=models.IntegerField(help_text='Tuotteen hinta senttein\xe4.', verbose_name='Tuotteen hinta'),
        ),
        migrations.AlterField(
            model_name='transactionitem',
            name='purchase_price',
            field=models.IntegerField(help_text='Tuotteen hinta ostoshetkell\xe4', verbose_name='Tuotteen hinta'),
        ),
    ]
